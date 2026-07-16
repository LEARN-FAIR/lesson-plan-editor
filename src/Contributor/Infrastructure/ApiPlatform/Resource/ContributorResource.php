<?php

namespace App\Contributor\Infrastructure\ApiPlatform\Resource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Contributor\Infrastructure\ApiPlatform\State\ContributorCollectionProvider;

#[ApiResource(
    shortName: 'Contributor',
    operations: [
        new GetCollection(
            uriTemplate: '/contributors',
            security: 'is_granted("PUBLIC_ACCESS")',
            provider: ContributorCollectionProvider::class,
        ),
    ],
)]
final class ContributorResource
{
    #[ApiProperty(identifier: true)]
    public ?string $id = null;

    public ?string $orcid = null;

    public string $firstName = '';

    public string $lastName = '';

    public ?string $git = null;
}
