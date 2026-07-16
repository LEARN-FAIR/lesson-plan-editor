<?php

namespace App\LessonPlan\Infrastructure\ApiPlatform\Resource;

/**
 * Result of a commit: mirrors the GitHub commit response shape used before the
 * API Platform migration ({ content?, commit }).
 */
final class LessonPlanSaveOutput
{
    /** @var array<string, mixed>|null */
    public ?array $content = null;

    /** @var array<string, mixed> */
    public array $commit = [];
}
