<?php

namespace App\Controller;

use App\Service\GitHubService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Serializer\SerializerInterface;

#[Route('/api/lesson-plans')]
class LessonPlanController extends AbstractController
{
    private GitHubService $githubService;
    private SerializerInterface $serializer;

    public function __construct(GitHubService $githubService, SerializerInterface $serializer)
    {
        $this->githubService = $githubService;
        $this->serializer = $serializer;
    }

    /**
     * Get all lesson plans from a repository
     */
    #[Route('', name: 'app_lesson_plans_list', methods: ['GET'])]
    public function listLessonPlans(Request $request): JsonResponse
    {
        $owner = $request->query->get('owner');
        $repo = $request->query->get('repo');
        $branch = $request->query->get('branch');
        $token = $this->getTokenFromRequest($request);

        if (!$owner || !$repo) {
            return $this->json(['error' => 'Owner and repo parameters are required'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $lessonPlans = $this->githubService->getLessonPlans($token, $owner, $repo, $branch);
            
            $lessonPlansArray = array_map(function ($lessonPlan) {
                return $lessonPlan->toArray();
            }, $lessonPlans);
            
            return $this->json($lessonPlansArray);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to fetch lesson plans: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get a specific lesson plan by path
     */
    #[Route('/file', name: 'app_lesson_plan_get', methods: ['GET'])]
    public function getLessonPlan(Request $request): JsonResponse
    {
        $owner = $request->query->get('owner');
        $repo = $request->query->get('repo');
        $path = $request->query->get('path');
        $branch = $request->query->get('branch');
        $token = $this->getTokenFromRequest($request);

        if (!$owner || !$repo || !$path) {
            return $this->json(['error' => 'Owner, repo, and path parameters are required'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $lessonPlan = $this->githubService->getLessonPlan($token, $owner, $repo, $path, $branch);
            return $this->json($lessonPlan->toArray());
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to fetch lesson plan: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Create or update a lesson plan
     */
    #[Route('/file', name: 'app_lesson_plan_save', methods: ['POST'])]
    public function saveLessonPlan(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $token = $this->getTokenFromRequest($request);
        
        $owner = $data['owner'] ?? null;
        $repo = $data['repo'] ?? null;
        $path = $data['path'] ?? null;
        $content = $data['content'] ?? null;
        $commitMessage = $data['commitMessage'] ?? 'Update lesson plan';
        $sha = $data['sha'] ?? null;
        $branch = $data['branch'] ?? null;

        if (!$owner || !$repo || !$path || !$content) {
            return $this->json(['error' => 'Owner, repo, path, and content are required'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $result = $this->githubService->commitFile($token, $owner, $repo, $path, $content, $commitMessage, $sha, $branch);
            return $this->json($result);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to save lesson plan: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Extract token from Authorization header or request body
     */
    private function getTokenFromRequest(Request $request): string
    {
        // First try to get from Authorization header
        $authHeader = $request->headers->get('Authorization');
        if ($authHeader && strpos($authHeader, 'Bearer ') === 0) {
            return substr($authHeader, 7);
        }
        
        // Then try to get from request body
        $content = json_decode($request->getContent(), true);
        if (isset($content['token'])) {
            return $content['token'];
        }
        
        throw new AccessDeniedException('No valid GitHub token provided');
    }
}
