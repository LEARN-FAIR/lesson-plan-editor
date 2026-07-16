<?php

namespace App\LessonPlan\Infrastructure\ApiPlatform\Resource;

/**
 * Request body for saving (committing) a lesson plan.
 */
final class SaveLessonPlanInput
{
    public ?string $owner = null;

    public ?string $repo = null;

    public ?string $path = null;

    public ?string $content = null;

    public string $commitMessage = 'Update lesson plan';

    public ?string $sha = null;

    public ?string $branch = null;

    /** @var array<int, array<string, mixed>>|null */
    public ?array $customContributors = null;
}
