<?php

namespace App\Controller;

use App\Security\GithubUser;
use App\Service\GitHubService;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    private ClientRegistry $clientRegistry;
    private UrlGeneratorInterface $urlGenerator;
    private GitHubService $githubService;

    private JWTTokenManagerInterface $jwtManager;
    private TokenStorageInterface $tokenStorage;

    public function __construct(
        ClientRegistry $clientRegistry, 
        UrlGeneratorInterface $urlGenerator, 
        GitHubService $githubService,
        JWTTokenManagerInterface $jwtManager,
        TokenStorageInterface $tokenStorage
    ) {
        $this->clientRegistry = $clientRegistry;
        $this->urlGenerator = $urlGenerator;
        $this->githubService = $githubService;
        $this->jwtManager = $jwtManager;
        $this->tokenStorage = $tokenStorage;
    }

    /**
     * Redirect to GitHub for authentication
     */
    #[Route('/github', name: 'app_auth_github_connect', methods: ['GET'])]
    public function connectGitHub(): Response
    {
        return $this->clientRegistry
            ->getClient('github')
            ->redirect(['user', 'repo'], []);
    }

    /**
     * Handle GitHub callback after authentication
     */
    #[Route('/github/callback', name: 'app_auth_github_callback', methods: ['GET'])]
    public function githubCallback(Request $request): Response
    {
        try {
            $client = $this->clientRegistry->getClient('github');
            $accessToken = $client->getAccessToken();
            
            // Get GitHub access token
            $githubAccessToken = $accessToken->getToken();
            
            // Store GitHub token in session for API calls
            $session = $request->getSession();
            $session->set('github_token', $githubAccessToken);
            
            // Get user info from GitHub
            $githubUser = $this->githubService->getUserInfo($githubAccessToken);
            
            // Store user ID in session for authentication
            $session->set('github_user_id', (string)$githubUser->getId());
            $session->set('github_username', $githubUser->getLogin());
            $session->set('github_email', $githubUser->getEmail());
            $session->set('github_avatar', $githubUser->getAvatarUrl());
            
            // Debug: Verify token was stored
            error_log('GitHub token stored in session: ' . substr($githubAccessToken, 0, 5) . '...');
            error_log('GitHub user ID stored in session: ' . $githubUser->getId());
            
            // Get the frontend URL from environment variable
            $frontendUrl = $_ENV['FRONTEND_URL'];
            
            // Redirect to frontend with authentication success indicator
            return new RedirectResponse($frontendUrl . '/#auth=success');
        } catch (\Exception $e) {
            // Log the error
            error_log('GitHub callback error: ' . $e->getMessage());
            
            // Get the frontend URL from environment variable
            $frontendUrl = $_ENV['FRONTEND_URL'];
            
            // Redirect to frontend with error
            return new RedirectResponse($frontendUrl . '/#error=' . urlencode($e->getMessage()));
        }
    }
    
    /**
     * Check authentication status
     */
    #[Route('/status', name: 'app_auth_status', methods: ['GET'])]
    public function checkAuthStatus(Request $request): JsonResponse
    {
        $session = $request->getSession();
        
        // Check if GitHub token exists in session
        if ($session->has('github_token')) {
            return $this->json([
                'authenticated' => true,
                'user' => [
                    'id' => $session->get('github_user_id'),
                    'login' => $session->get('github_username'),
                    'email' => $session->get('github_email'),
                    'avatar_url' => $session->get('github_avatar')
                ]
            ]);
        }
        
        return $this->json(['authenticated' => false]);
    }
    
    /**
     * Logout - clear session
     */
    #[Route('/logout', name: 'app_auth_logout', methods: ['POST'])]
    public function logout(Request $request): JsonResponse
    {
        // Clear the session
        $session = $request->getSession();
        $session->remove('github_token');
        $session->remove('github_user_id');
        $session->remove('github_username');
        $session->remove('github_email');
        $session->remove('github_avatar');
        
        return $this->json(['success' => true, 'message' => 'Logged out successfully']);
    }
    
}
