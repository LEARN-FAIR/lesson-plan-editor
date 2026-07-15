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
        try {
            $token = $this->getTokenFromSession($request);
            $user = $this->githubService->getUserInfo($token);
            return $this->json($user->toArray());
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to fetch user info: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get repositories for the authenticated user
     * 
     * Only returns elixir-europe-training/ELIXIR-TrP-FAIR-Converge or its forks
     */
    #[Route('/repositories', name: 'app_github_repositories', methods: ['GET'])]
    public function getRepositories(Request $request): JsonResponse
    {
        $token = $this->getTokenFromSession($request);

        try {
            // Use the new method that filters for target repository and its forks
            $repositories = $this->githubService->getTargetRepoAndForks($token);
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
     * Get commits for a branch
     */
    #[Route('/repository/{owner}/{repo}/commits', name: 'app_github_branch_commits', methods: ['GET'])]
    public function getBranchCommits(Request $request, string $owner, string $repo): JsonResponse
    {
        $branch = $request->query->get('branch');
        
        if (!$branch) {
            return $this->json(['error' => 'Branch parameter is required'], Response::HTTP_BAD_REQUEST);
        }
        
        $perPage = (int)$request->query->get('per_page', 30);
        $token = $this->getTokenFromSession($request);

        try {
            $commits = $this->githubService->getBranchCommits($token, $owner, $repo, $branch, $perPage);
            return $this->json($commits);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to fetch commits: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Create a new branch
     */
    #[Route('/repository/{owner}/{repo}/branches', name: 'app_github_create_branch', methods: ['POST'])]
    public function createBranch(Request $request, string $owner, string $repo): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $branchName = $data['branchName'] ?? null;
        $sourceBranch = $data['sourceBranch'] ?? null;
        
        if (!$branchName || !$sourceBranch) {
            return $this->json(['error' => 'branchName and sourceBranch are required'], Response::HTTP_BAD_REQUEST);
        }
        
        $token = $this->getTokenFromSession($request);

        try {
            $result = $this->githubService->createBranch($token, $owner, $repo, $branchName, $sourceBranch);
            return $this->json($result);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Failed to create branch: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get GitHub token from session for authenticated users
     */
    private function getTokenFromSession(Request $request = null): string
    {
        // First check if we have a user from JWT authentication
        $user = $this->getUser();
        
        if (!$user) {
            throw new AccessDeniedException('Not authenticated. Please login first.');
        }
        
        // Get the request if not provided
        $request = $request ?? $this->container->get('request_stack')->getCurrentRequest();
        
        // Get GitHub token from session
        $token = $request->getSession()->get('github_token');
        
        if (!$token) {
            throw new AccessDeniedException('GitHub token not found in session. Please login again.');
        }
        
        return $token;
    }
}
