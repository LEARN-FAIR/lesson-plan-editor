<?php

namespace App\Auth\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\Auth\Infrastructure\ApiPlatform\State\LogoutProcessor;

#[ApiResource(
    shortName: 'Authentication',
    operations: [
        new Post(
            uriTemplate: '/auth/logout',
            status: 200,
            security: 'is_granted("PUBLIC_ACCESS")',
            read: false,
            deserialize: false,
            processor: LogoutProcessor::class,
        ),
    ],
)]
final class LogoutResource
{
    public bool $success = true;

    public string $message = 'Logged out successfully';
}
