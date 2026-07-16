<?php

namespace App\Auth\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Auth\Infrastructure\ApiPlatform\Resource\AuthStatusResource;
use App\Auth\Infrastructure\GithubSession;

/**
 * @implements ProviderInterface<AuthStatusResource>
 */
final class AuthStatusProvider implements ProviderInterface
{
    public function __construct(private readonly GithubSession $session)
    {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): AuthStatusResource
    {
        $resource = new AuthStatusResource();

        if ($this->session->isAuthenticated()) {
            $resource->authenticated = true;
            $resource->user = $this->session->user();
        }

        return $resource;
    }
}
