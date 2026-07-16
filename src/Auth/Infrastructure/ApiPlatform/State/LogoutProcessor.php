<?php

namespace App\Auth\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Auth\Infrastructure\ApiPlatform\Resource\LogoutResource;
use App\Auth\Infrastructure\GithubSession;

/**
 * @implements ProcessorInterface<mixed, LogoutResource>
 */
final class LogoutProcessor implements ProcessorInterface
{
    public function __construct(private readonly GithubSession $session)
    {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): LogoutResource
    {
        $this->session->clear();

        return new LogoutResource();
    }
}
