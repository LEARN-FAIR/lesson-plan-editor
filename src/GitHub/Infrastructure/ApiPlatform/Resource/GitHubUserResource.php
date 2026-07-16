<?php

namespace App\GitHub\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\GitHub\Infrastructure\ApiPlatform\State\GitHubUserProvider;
use Symfony\Component\Serializer\Attribute\SerializedName;

#[ApiResource(
    shortName: 'GitHubUser',
    operations: [
        new Get(
            uriTemplate: '/github/user',
            uriVariables: [],
            security: 'is_granted("ROLE_USER")',
            provider: GitHubUserProvider::class,
        ),
    ],
)]
final class GitHubUserResource
{
    public mixed $id = null;

    public ?string $login = null;

    public ?string $name = null;

    public ?string $email = null;

    #[SerializedName('avatar_url')]
    public ?string $avatarUrl = null;

    #[SerializedName('html_url')]
    public ?string $htmlUrl = null;

    /**
     * @param array{id: mixed, login: ?string, name: ?string, email: ?string, avatar_url: ?string, html_url: ?string} $data
     */
    public static function fromArray(array $data): self
    {
        $resource = new self();
        $resource->id = $data['id'] ?? null;
        $resource->login = $data['login'] ?? null;
        $resource->name = $data['name'] ?? null;
        $resource->email = $data['email'] ?? null;
        $resource->avatarUrl = $data['avatar_url'] ?? null;
        $resource->htmlUrl = $data['html_url'] ?? null;

        return $resource;
    }
}
