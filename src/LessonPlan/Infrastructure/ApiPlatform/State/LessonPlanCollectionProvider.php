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
 * @implements ProviderInterface<LessonPlanResource>
 */
final class LessonPlanCollectionProvider implements ProviderInterface
{
    public function __construct(
        private readonly GitHubService $githubService,
        private readonly GithubSession $session,
        private readonly RequestStack $requestStack,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): iterable
    {
        $request = $this->requestStack->getCurrentRequest();
        $owner = $request?->query->get('owner');
        $repo = $request?->query->get('repo');
        $branch = $request?->query->get('branch');

        if (!$owner || !$repo) {
            throw new BadRequestHttpException('Owner and repo parameters are required');
        }

        $token = $this->session->requireToken();

        $lessonPlans = $this->githubService->getLessonPlans($token, $owner, $repo, $branch);

        return array_map(
            static fn ($lessonPlan) => LessonPlanResource::fromModel($lessonPlan),
            $lessonPlans,
        );
    }
}
