<?php

namespace App\LessonPlan\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\LessonPlan\Infrastructure\ApiPlatform\State\LessonPlanCollectionProvider;
use App\LessonPlan\Infrastructure\ApiPlatform\State\LessonPlanItemProvider;
use App\LessonPlan\Infrastructure\ApiPlatform\State\LessonPlanSaveProcessor;
use App\Model\LessonPlan;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ApiResource(
    shortName: 'LessonPlan',
    operations: [
        new GetCollection(
            uriTemplate: '/lesson-plans',
            security: 'is_granted("ROLE_USER")',
            provider: LessonPlanCollectionProvider::class,
        ),
        new Get(
            uriTemplate: '/lesson-plans/file',
            uriVariables: [],
            security: 'is_granted("ROLE_USER")',
            provider: LessonPlanItemProvider::class,
        ),
        new Post(
            uriTemplate: '/lesson-plans/file',
            security: 'is_granted("ROLE_USER")',
            input: SaveLessonPlanInput::class,
            output: LessonPlanSaveOutput::class,
            normalizationContext: ['skip_null_values' => true],
            processor: LessonPlanSaveProcessor::class,
        ),
    ],
)]
class LessonPlanResource
{
    #[ApiProperty(identifier: true)]
    public ?string $path = null;

    public ?string $name = null;

    public ?string $title = null;

    public ?string $sha = null;

    public ?string $content = null;

    #[SerializedName('decoded_content')]
    public ?string $decodedContent = null;

    #[SerializedName('html_url')]
    public ?string $htmlUrl = null;

    /** @var array{title: string, number: int}|null */
    public ?array $category = null;

    public static function fromModel(LessonPlan $lessonPlan): self
    {
        $resource = new self();
        $resource->name = $lessonPlan->getName();
        $resource->title = $lessonPlan->getTitle();
        $resource->path = $lessonPlan->getPath();
        $resource->sha = $lessonPlan->getSha();
        $resource->content = $lessonPlan->getContent();
        $resource->decodedContent = $lessonPlan->getDecodedContent();
        $resource->htmlUrl = $lessonPlan->getHtmlUrl();
        $resource->category = $lessonPlan->getCategory()?->toArray();

        return $resource;
    }
}
