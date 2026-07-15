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
        $customContributors = $data['customContributors'] ?? null;

        if (!$owner || !$repo || !$path || !$content) {
            return $this->json(['error' => 'Owner, repo, path, and content are required'], Response::HTTP_BAD_REQUEST);
        }

        try {
            // If we have custom contributors, commit both files together
            if ($customContributors && !empty($customContributors)) {
                // Fetch existing contributors file to merge with custom ones
                $existingYaml = $this->fetchExistingContributors($token, $owner, $repo, $branch);
                
                // Merge custom contributors with existing ones
                $yamlContent = $this->mergeContributorsToYaml($customContributors, $existingYaml);
                
                // Commit both files in a single commit
                $files = [
                    ['path' => $path, 'content' => $content],
                    ['path' => '_data/contributors.yaml', 'content' => $yamlContent]
                ];
                
                $result = $this->githubService->commitMultipleFiles(
                    $token, 
                    $owner, 
                    $repo, 
                    $files, 
                    $commitMessage, 
                    $branch
                );
            } else {
                // Just commit the lesson plan file
                $result = $this->githubService->commitFile($token, $owner, $repo, $path, $content, $commitMessage, $sha, $branch);
            }
            
            return $this->json($result);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to save lesson plan: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Fetch existing contributors file from the repository
     */
    private function fetchExistingContributors(string $token, string $owner, string $repo, ?string $branch): string
    {
        try {
            // Try to fetch the existing contributors file
            $response = $this->githubService->getFileContent($token, $owner, $repo, '_data/contributors.yaml', $branch);
            return $response['content'] ?? '';
        } catch (\Exception $e) {
            // If file doesn't exist, return empty string (we'll create it)
            return '';
        }
    }
    
    /**
     * Merge custom contributors with existing YAML content
     */
    private function mergeContributorsToYaml(array $customContributors, string $existingYaml): string
    {
        // Parse existing YAML if it exists
        $existingData = [];
        if (!empty($existingYaml)) {
            try {
                $existingData = \Symfony\Component\Yaml\Yaml::parse($existingYaml) ?? [];
            } catch (\Exception $e) {
                // If parsing fails, start fresh
                $existingData = [];
            }
        }
        
        // Ensure existingData is an array (not associative)
        if (!is_array($existingData)) {
            $existingData = [];
        }
        
        // If it's an associative array (object), convert to sequential array
        if (!empty($existingData) && array_keys($existingData) !== range(0, count($existingData) - 1)) {
            // It's an associative array, convert to sequential
            $sequential = [];
            foreach ($existingData as $id => $data) {
                $data['id'] = $id;
                $sequential[] = $data;
            }
            $existingData = $sequential;
        }
        
        // Create a map of existing contributors by ID for quick lookup
        $existingMap = [];
        foreach ($existingData as $index => $contributor) {
            if (isset($contributor['id'])) {
                $existingMap[$contributor['id']] = $index;
            }
        }
        
        // Add or update custom contributors
        foreach ($customContributors as $contributor) {
            $id = $contributor['id'] ?? '';
            if (!empty($id)) {
                $contributorData = [
                    'id' => $id,
                    'orcid' => $contributor['orcid'] ?? null,
                    'firstName' => $contributor['firstName'] ?? '',
                    'lastName' => $contributor['lastName'] ?? '',
                    'git' => $contributor['git'] ?? null
                ];
                
                if (isset($existingMap[$id])) {
                    // Update existing contributor
                    $existingData[$existingMap[$id]] = $contributorData;
                } else {
                    // Add new contributor
                    $existingData[] = $contributorData;
                }
            }
        }
        
        // Convert back to YAML with array format
        return \Symfony\Component\Yaml\Yaml::dump($existingData, 3, 2);
    }

    /**
     * Get GitHub token from session for authenticated users
     */
    private function getTokenFromRequest(Request $request): string
    {
        // First check if we have a user from JWT authentication
        $user = $this->getUser();
        
        if (!$user) {
            throw new AccessDeniedException('Not authenticated. Please login first.');
        }
        
        // Get GitHub token from session
        $token = $request->getSession()->get('github_token');
        
        if (!$token) {
            throw new AccessDeniedException('GitHub token not found in session. Please login again.');
        }
        
        return $token;
    }
}
