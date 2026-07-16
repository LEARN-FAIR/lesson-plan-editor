<?php

namespace App\Auth\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\Auth\Infrastructure\ApiPlatform\State\AuthStatusProvider;

#[ApiResource(
    shortName: 'Authentication',
    operations: [
        new Get(
            uriTemplate: '/auth/status',
            uriVariables: [],
            security: 'is_granted("PUBLIC_ACCESS")',
            normalizationContext: ['skip_null_values' => true],
            provider: AuthStatusProvider::class,
        ),
    ],
)]
final class AuthStatusResource
{
    public bool $authenticated = false;

    /** @var array{id: mixed, login: mixed, email: mixed, avatar_url: mixed}|null */
    public ?array $user = null;
}
