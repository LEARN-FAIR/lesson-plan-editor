<?php

namespace App\Contributor\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Contributor\Infrastructure\ApiPlatform\Resource\ContributorResource;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Yaml\Yaml;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Reads contributors from a repository's _data/contributors.yaml
 * (GET /api/contributors). Public endpoint backed by raw.githubusercontent.com.
 *
 * @implements ProviderInterface<ContributorResource>
 */
final class ContributorCollectionProvider implements ProviderInterface
{
    private const DEFAULT_OWNER = 'elixir-europe-training';
    private const DEFAULT_REPO = 'ELIXIR-TrP-FAIR-Converge';
    private const DEFAULT_BRANCH = 'main';
    private const CONTRIBUTORS_PATH = '_data/contributors.yaml';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly RequestStack $requestStack,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): iterable
    {
        $request = $this->requestStack->getCurrentRequest();
        $owner = $request?->query->get('owner', self::DEFAULT_OWNER) ?? self::DEFAULT_OWNER;
        $repo = $request?->query->get('repo', self::DEFAULT_REPO) ?? self::DEFAULT_REPO;
        $branch = $request?->query->get('branch', self::DEFAULT_BRANCH) ?? self::DEFAULT_BRANCH;

        try {
            $url = sprintf(
                'https://raw.githubusercontent.com/%s/%s/refs/heads/%s/%s',
                $owner,
                $repo,
                $branch,
                self::CONTRIBUTORS_PATH,
            );

            $response = $this->httpClient->request('GET', $url);

            if ($response->getStatusCode() !== 200) {
                throw new \RuntimeException("Failed to fetch contributors: {$response->getStatusCode()}");
            }

            $yamlData = Yaml::parse($response->getContent()) ?? [];

            $contributors = [];
            foreach ($yamlData as $id => $contributor) {
                $resource = new ContributorResource();
                $resource->id = $contributor['orcid'] ?? (string) $id;
                $resource->orcid = $contributor['orcid'] ?? null;
                $resource->firstName = $contributor['firstName'] ?? $contributor['first_name'] ?? '';
                $resource->lastName = $contributor['lastName'] ?? $contributor['last_name'] ?? '';
                $resource->git = $contributor['git'] ?? null;
                $contributors[] = $resource;
            }

            return $contributors;
        } catch (\Throwable $e) {
            $this->logger->error('Error fetching contributors: ' . $e->getMessage());

            return [];
        }
    }
}
