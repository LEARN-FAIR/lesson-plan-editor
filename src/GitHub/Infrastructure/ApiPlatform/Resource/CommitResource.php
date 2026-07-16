<?php

namespace App\GitHub\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\GitHub\Infrastructure\ApiPlatform\State\CommitCollectionProvider;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ApiResource(
    shortName: 'Commit',
    operations: [
        new GetCollection(
            uriTemplate: '/github/repository/{owner}/{repo}/commits',
            uriVariables: ['owner', 'repo'],
            security: 'is_granted("ROLE_USER")',
            provider: CommitCollectionProvider::class,
        ),
    ],
)]
final class CommitResource
{
    #[ApiProperty(identifier: true)]
    public ?string $sha = null;

    /** @var array<string, mixed> */
    public array $commit = [];

    /** @var array<string, mixed> */
    public array $author = [];

    /** @var array<string, mixed> */
    public array $committer = [];

    #[SerializedName('html_url')]
    public ?string $htmlUrl = null;

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $resource = new self();
        $resource->sha = $data['sha'] ?? null;
        $resource->commit = $data['commit'] ?? [];
        $resource->author = $data['author'] ?? [];
        $resource->committer = $data['committer'] ?? [];
        $resource->htmlUrl = $data['html_url'] ?? null;

        return $resource;
    }
}
