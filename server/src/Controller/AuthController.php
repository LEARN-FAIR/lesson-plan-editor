<?php

namespace App\Controller;

use App\Security\GithubUser;
use App\Service\GitHubService;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
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
            
            // Get user info from GitHub
            $githubUser = $this->githubService->getUserInfo($accessToken->getToken());
            
            // Create a GithubUser object for JWT authentication
            // Using the App\Security\GithubUser class which is different from App\Model\GitHubUser
            $user = new GithubUser(
                (string)$githubUser->getId(), // Convert to string as Security\GithubUser expects string identifier
                $githubUser->getLogin(),
                $githubUser->getEmail(),
                $githubUser->getAvatarUrl()
            );
            
            // Generate JWT token
            $token = $this->jwtManager->create($user);
            
            // Get the frontend URL from environment variable
            $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:3000';
            
            // Redirect to frontend with token in URL fragment
            return $this->redirect($frontendUrl . '/auth/callback#token=' . $token);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Authentication failed: ' . $e->getMessage()], Response::HTTP_UNAUTHORIZED);
        }
    }
    
    /**
     * Check authentication status
     */
    #[Route('/status', name: 'app_auth_status', methods: ['GET'])]
    public function checkAuthStatus(Request $request): JsonResponse
    {
        // Get the JWT token from the Authorization header
        $authHeader = $request->headers->get('Authorization');
        $token = null;
        
        if ($authHeader && strpos($authHeader, 'Bearer ') === 0) {
            $token = substr($authHeader, 7);
        }
        
        if (!$token) {
            return $this->json([
                'authenticated' => false,
                'message' => 'No token provided'
            ]);
        }
        
        try {
            // The JWT token will be automatically validated by the JWT firewall
            // If we get here, the token is valid
            $user = $this->getUser();
            
            if (!$user) {
                return $this->json([
                    'authenticated' => false,
                    'message' => 'Invalid token'
                ]);
            }
            
            return $this->json([
                'authenticated' => true,
                'user' => $user instanceof GithubUser ? $user->toArray() : null
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'authenticated' => false,
                'message' => 'Invalid token: ' . $e->getMessage()
            ], Response::HTTP_UNAUTHORIZED);
        }
    }
    
    /**
     * Logout - invalidate token
     * 
     * Note: With JWT, we can't actually invalidate the token on the server side
     * without implementing a token blacklist. The client should discard the token.
     */
    #[Route('/logout', name: 'app_auth_logout', methods: ['POST'])]
    public function logout(): JsonResponse
    {
        // For JWT, the client should discard the token
        // We just return a success response
        return $this->json(['success' => true, 'message' => 'Logged out successfully']);
    }
    
    /**
     * Get token for authenticated user
     */
    #[Route('/token', name: 'app_auth_token', methods: ['POST'])]
    public function getToken(): JsonResponse
    {
        // This endpoint is handled by the lexik_jwt_authentication bundle
        // It will never be reached directly
        return $this->json(['error' => 'This endpoint should not be called directly']);
    }
}
