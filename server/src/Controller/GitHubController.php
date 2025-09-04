<?php

namespace App\Controller;

use App\Service\GitHubService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

#[Route('/api/github')]
class GitHubController extends AbstractController
{
    private GitHubService $githubService;

    public function __construct(GitHubService $githubService)
    {
        $this->githubService = $githubService;
    }

    /**
     * Get authenticated user information
     */
    #[Route('/user', name: 'app_github_user', methods: ['GET'])]
    public function getUserInfo(Request $request): JsonResponse
    {
        $token = $this->getTokenFromSession($request);

        try {
            $user = $this->githubService->getUserInfo($token);
            return $this->json($user->toArray());
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to fetch user info: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get repositories for the authenticated user
     */
    #[Route('/repositories', name: 'app_github_repositories', methods: ['GET'])]
    public function getRepositories(Request $request): JsonResponse
    {
        $token = $this->getTokenFromSession($request);

        try {
            $repositories = $this->githubService->getUserRepositories($token);
            return $this->json($repositories);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to fetch repositories: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Check if user has access to a repository
     */
    #[Route('/repository/access', name: 'app_github_repository_access', methods: ['GET'])]
    public function checkRepositoryAccess(Request $request): JsonResponse
    {
        $owner = $request->query->get('owner');
        $repo = $request->query->get('repo');
        $token = $this->getTokenFromSession($request);

        if (!$owner || !$repo) {
            return $this->json(['error' => 'Owner and repo parameters are required'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $repository = $this->githubService->checkRepositoryAccess($token, $owner, $repo);
            return $this->json($repository->toArray());
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to check repository access: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get token from session
     */
    private function getTokenFromSession(Request $request = null): string
    {
        $request = $request ?? $this->container->get('request_stack')->getCurrentRequest();
        $token = $request->getSession()->get('github_token');
        
        if (!$token) {
            throw new AccessDeniedException('Not authenticated. Please login first.');
        }
        
        return $token;
    }
}
