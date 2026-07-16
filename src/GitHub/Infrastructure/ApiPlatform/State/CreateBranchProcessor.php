<?php

namespace App\GitHub\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Auth\Infrastructure\GithubSession;
use App\GitHub\Infrastructure\ApiPlatform\Resource\CreateBranchInput;
use App\GitHub\Infrastructure\ApiPlatform\Resource\CreateBranchResource;
use App\Service\GitHubService;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Creates a branch (POST /api/github/repository/{owner}/{repo}/branches).
 *
 * @implements ProcessorInterface<CreateBranchInput, CreateBranchResource>
 */
final class CreateBranchProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly GitHubService $githubService,
        private readonly GithubSession $session,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): CreateBranchResource
    {
        \assert($data instanceof CreateBranchInput);

        if (!$data->branchName || !$data->sourceBranch) {
            throw new BadRequestHttpException('branchName and sourceBranch are required');
        }

        $result = $this->githubService->createBranch(
            $this->session->requireToken(),
            (string) ($uriVariables['owner'] ?? ''),
            (string) ($uriVariables['repo'] ?? ''),
            $data->branchName,
            $data->sourceBranch,
        );

        return CreateBranchResource::fromArray($result);
    }
}
