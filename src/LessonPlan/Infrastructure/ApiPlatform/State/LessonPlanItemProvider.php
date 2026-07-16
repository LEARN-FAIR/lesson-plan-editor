<?php

namespace App\LessonPlan\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Auth\Infrastructure\GithubSession;
use App\LessonPlan\Infrastructure\ApiPlatform\Resource\LessonPlanResource;
use App\Service\GitHubService;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Reads a single lesson plan identified by its ?path= query parameter
 * (GET /api/lesson-plans/file).
 *
 * @implements ProviderInterface<LessonPlanResource>
 */
final class LessonPlanItemProvider implements ProviderInterface
{
    public function __construct(
        private readonly GitHubService $githubService,
        private readonly GithubSession $session,
        private readonly RequestStack $requestStack,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?LessonPlanResource
    {
        $request = $this->requestStack->getCurrentRequest();
        $owner = $request?->query->get('owner');
        $repo = $request?->query->get('repo');
        $path = $request?->query->get('path');
        $branch = $request?->query->get('branch');

        if (!$owner || !$repo || !$path) {
            throw new BadRequestHttpException('Owner, repo, and path parameters are required');
        }

        $token = $this->session->requireToken();

        $lessonPlan = $this->githubService->getLessonPlan($token, $owner, $repo, $path, $branch);

        return LessonPlanResource::fromModel($lessonPlan);
    }
}
