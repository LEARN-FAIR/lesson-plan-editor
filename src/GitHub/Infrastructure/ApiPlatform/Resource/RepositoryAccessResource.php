<?php

namespace App\GitHub\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\GitHub\Infrastructure\ApiPlatform\State\RepositoryAccessProvider;

#[ApiResource(
    shortName: 'RepositoryAccess',
    operations: [
        new Get(
            uriTemplate: '/github/repository/access',
            uriVariables: [],
            security: 'is_granted("ROLE_USER")',
            provider: RepositoryAccessProvider::class,
        ),
    ],
)]
final class RepositoryAccessResource
{
    public ?string $owner = null;

    public ?string $name = null;

    public ?string $branch = null;

    public ?string $defaultBranch = null;

    public bool $hasWriteAccess = false;

    /** @var array<int, string> */
    public array $branches = [];

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $resource = new self();
        $resource->owner = $data['owner'] ?? null;
        $resource->name = $data['name'] ?? null;
        $resource->branch = $data['branch'] ?? null;
        $resource->defaultBranch = $data['defaultBranch'] ?? null;
        $resource->hasWriteAccess = (bool) ($data['hasWriteAccess'] ?? false);
        $resource->branches = $data['branches'] ?? [];

        return $resource;
    }
}
