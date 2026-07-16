<?php

namespace App\Auth\Infrastructure;

use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * Read/write helper for the GitHub OAuth data kept in the session.
 *
 * The editor stores the user's GitHub access token (and profile) in the session
 * after the OAuth callback; API Platform providers/processors use this to make
 * authenticated GitHub calls on the user's behalf.
 */
final class GithubSession
{
    public function __construct(private readonly RequestStack $requestStack)
    {
    }

    public function isAuthenticated(): bool
    {
        return $this->requestStack->getSession()->has('github_token');
    }

    public function token(): ?string
    {
        return $this->requestStack->getSession()->get('github_token');
    }

    public function requireToken(): string
    {
        $token = $this->token();

        if (!$token) {
            throw new AccessDeniedException('GitHub token not found in session. Please login again.');
        }

        return $token;
    }

    /**
     * @return array{id: mixed, login: mixed, email: mixed, avatar_url: mixed}
     */
    public function user(): array
    {
        $session = $this->requestStack->getSession();

        return [
            'id' => $session->get('github_user_id'),
            'login' => $session->get('github_username'),
            'email' => $session->get('github_email'),
            'avatar_url' => $session->get('github_avatar'),
        ];
    }

    public function clear(): void
    {
        $session = $this->requestStack->getSession();

        foreach (['github_token', 'github_user_id', 'github_username', 'github_email', 'github_avatar'] as $key) {
            $session->remove($key);
        }
    }
}
