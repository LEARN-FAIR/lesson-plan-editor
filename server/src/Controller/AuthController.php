<?php

namespace App\Controller;

use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    private ClientRegistry $clientRegistry;
    private UrlGeneratorInterface $urlGenerator;

    public function __construct(ClientRegistry $clientRegistry, UrlGeneratorInterface $urlGenerator)
    {
        $this->clientRegistry = $clientRegistry;
        $this->urlGenerator = $urlGenerator;
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
            
            // Get the frontend URL from environment variable
            $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:3000';
            
            // Redirect to frontend with token
            return $this->redirect($frontendUrl . '/auth/callback?token=' . $accessToken->getToken());
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Authentication failed: ' . $e->getMessage()], Response::HTTP_UNAUTHORIZED);
        }
    }
}
