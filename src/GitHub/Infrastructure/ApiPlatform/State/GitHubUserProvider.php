<?php

namespace App\GitHub\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Auth\Infrastructure\GithubSession;
use App\GitHub\Infrastructure\ApiPlatform\Resource\GitHubUserResource;
use App\Service\GitHubService;

/**
 * @implements ProviderInterface<GitHubUserResource>
 */
final class GitHubUserProvider implements ProviderInterface
{
    public function __construct(
        private readonly GitHubService $githubService,
        private readonly GithubSession $session,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): GitHubUserResource
    {
        $user = $this->githubService->getUserInfo($this->session->requireToken());

        return GitHubUserResource::fromArray($user->toArray());
    }
}
