<?php

namespace App\GitHub\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\GitHub\Infrastructure\ApiPlatform\State\CreateBranchProcessor;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ApiResource(
    shortName: 'CreateBranch',
    operations: [
        new Post(
            uriTemplate: '/github/repository/{owner}/{repo}/branches',
            uriVariables: ['owner', 'repo'],
            security: 'is_granted("ROLE_USER")',
            input: CreateBranchInput::class,
            output: CreateBranchResource::class,
            normalizationContext: ['skip_null_values' => true],
            processor: CreateBranchProcessor::class,
        ),
    ],
)]
final class CreateBranchResource
{
    public ?string $ref = null;

    #[SerializedName('node_id')]
    public ?string $nodeId = null;

    public ?string $url = null;

    /** @var array<string, mixed>|null */
    public ?array $object = null;

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $resource = new self();
        $resource->ref = $data['ref'] ?? null;
        $resource->nodeId = $data['node_id'] ?? null;
        $resource->url = $data['url'] ?? null;
        $resource->object = $data['object'] ?? null;

        return $resource;
    }
}
