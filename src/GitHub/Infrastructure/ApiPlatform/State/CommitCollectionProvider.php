<?php

namespace App\GitHub\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Auth\Infrastructure\GithubSession;
use App\GitHub\Infrastructure\ApiPlatform\Resource\CommitResource;
use App\Service\GitHubService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Lists commits for a branch
 * (GET /api/github/repository/{owner}/{repo}/commits?branch=&per_page=).
 *
 * @implements ProviderInterface<CommitResource>
 */
final class CommitCollectionProvider implements ProviderInterface
{
    public function __construct(
        private readonly GitHubService $githubService,
        private readonly GithubSession $session,
        private readonly RequestStack $requestStack,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): iterable
    {
        $owner = $uriVariables['owner'] ?? null;
        $repo = $uriVariables['repo'] ?? null;

        $request = $this->requestStack->getCurrentRequest();
        $branch = $request?->query->get('branch');
        $perPage = (int) ($request?->query->get('per_page', 30) ?? 30);

        if (!$branch) {
            throw new BadRequestHttpException('Branch parameter is required');
        }

        $commits = $this->githubService->getBranchCommits(
            $this->session->requireToken(),
            (string) $owner,
            (string) $repo,
            $branch,
            $perPage,
        );

        return array_map(
            static fn (array $commit) => CommitResource::fromArray($commit),
            $commits,
        );
    }
}
