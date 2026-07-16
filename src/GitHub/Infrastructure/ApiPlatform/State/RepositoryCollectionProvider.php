<?php

namespace App\GitHub\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Auth\Infrastructure\GithubSession;
use App\GitHub\Infrastructure\ApiPlatform\Resource\RepositoryResource;
use App\Service\GitHubService;

/**
 * Returns the target repository (elixir-europe-training/ELIXIR-TrP-FAIR-Converge)
 * and the user's forks of it (GET /api/github/repositories).
 *
 * @implements ProviderInterface<RepositoryResource>
 */
final class RepositoryCollectionProvider implements ProviderInterface
{
    public function __construct(
        private readonly GitHubService $githubService,
        private readonly GithubSession $session,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): iterable
    {
        $repositories = $this->githubService->getTargetRepoAndForks($this->session->requireToken());

        return array_map(
            static fn (array $repo) => RepositoryResource::fromArray($repo),
            $repositories,
        );
    }
}
