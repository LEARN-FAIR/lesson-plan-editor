<?php

namespace App\GitHub\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\GitHub\Infrastructure\ApiPlatform\State\RepositoryCollectionProvider;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ApiResource(
    shortName: 'Repository',
    operations: [
        new GetCollection(
            uriTemplate: '/github/repositories',
            security: 'is_granted("ROLE_USER")',
            provider: RepositoryCollectionProvider::class,
        ),
    ],
)]
final class RepositoryResource
{
    #[ApiProperty(identifier: true)]
    public mixed $id = null;

    public ?string $name = null;

    #[SerializedName('full_name')]
    public ?string $fullName = null;

    /** @var array<string, mixed>|null */
    public ?array $owner = null;

    #[SerializedName('html_url')]
    public ?string $htmlUrl = null;

    public ?string $description = null;

    #[SerializedName('default_branch')]
    public ?string $defaultBranch = null;

    public bool $fork = false;

    /** @var array<string, mixed>|null */
    public ?array $source = null;

    /** @var array<string, mixed>|null */
    public ?array $parent = null;

    /** @var array<string, mixed> */
    public array $permissions = [];

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $resource = new self();
        $resource->id = $data['id'] ?? null;
        $resource->name = $data['name'] ?? null;
        $resource->fullName = $data['full_name'] ?? null;
        $resource->owner = $data['owner'] ?? null;
        $resource->htmlUrl = $data['html_url'] ?? null;
        $resource->description = $data['description'] ?? null;
        $resource->defaultBranch = $data['default_branch'] ?? null;
        $resource->fork = (bool) ($data['fork'] ?? false);
        $resource->source = $data['source'] ?? null;
        $resource->parent = $data['parent'] ?? null;
        $resource->permissions = $data['permissions'] ?? [];

        return $resource;
    }
}
