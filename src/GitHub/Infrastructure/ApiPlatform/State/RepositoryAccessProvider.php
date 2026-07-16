<?php

namespace App\GitHub\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Auth\Infrastructure\GithubSession;
use App\GitHub\Infrastructure\ApiPlatform\Resource\RepositoryAccessResource;
use App\Service\GitHubService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * @implements ProviderInterface<RepositoryAccessResource>
 */
final class RepositoryAccessProvider implements ProviderInterface
{
    public function __construct(
        private readonly GitHubService $githubService,
        private readonly GithubSession $session,
        private readonly RequestStack $requestStack,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): RepositoryAccessResource
    {
        $request = $this->requestStack->getCurrentRequest();
        $owner = $request?->query->get('owner');
        $repo = $request?->query->get('repo');

        if (!$owner || !$repo) {
            throw new BadRequestHttpException('Owner and repo parameters are required');
        }

        $repository = $this->githubService->checkRepositoryAccess($this->session->requireToken(), $owner, $repo);

        return RepositoryAccessResource::fromArray($repository->toArray());
    }
}
