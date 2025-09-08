<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Component\Yaml\Yaml;
use Psr\Log\LoggerInterface;

/**
 * Controller for fetching contributors data from GitHub
 */
class ContributorsController extends AbstractController
{
    private HttpClientInterface $httpClient;
    private LoggerInterface $logger;

    // Default repository and branch if not specified
    private const DEFAULT_OWNER = 'elixir-europe-training';
    private const DEFAULT_REPO = 'ELIXIR-TrP-FAIR-Converge';
    private const DEFAULT_BRANCH = 'main';
    private const CONTRIBUTORS_PATH = '_data/contributors.yaml';

    public function __construct(HttpClientInterface $httpClient, LoggerInterface $logger)
    {
        $this->httpClient = $httpClient;
        $this->logger = $logger;
    }

    /**
     * Fetch contributors from a GitHub repository's YAML file
     * This endpoint matches the existing API at http://localhost:4000/api/contributors
     * 
     * @Route("/api/contributors", name="get_contributors", methods={"GET"})
     */
    public function getContributors(Request $request): JsonResponse
    {
        // Get parameters from request or use defaults
        $owner = $request->query->get('owner', self::DEFAULT_OWNER);
        $repo = $request->query->get('repo', self::DEFAULT_REPO);
        $branch = $request->query->get('branch', self::DEFAULT_BRANCH);

        try {
            $contributorsUrl = sprintf(
                'https://raw.githubusercontent.com/%s/%s/refs/heads/%s/%s',
                $owner,
                $repo,
                $branch,
                self::CONTRIBUTORS_PATH
            );
            
            $this->logger->info("Fetching contributors from: {$contributorsUrl}");

            $response = $this->httpClient->request('GET', $contributorsUrl);
            
            if ($response->getStatusCode() !== 200) {
                throw new \Exception("Failed to fetch contributors: {$response->getStatusCode()}");
            }

            $yamlText = $response->getContent();
            $yamlData = Yaml::parse($yamlText);
            
            // Transform the data to match the expected frontend format
            $contributors = [];
            foreach ($yamlData as $id => $contributor) {
                // Ensure we have the required fields in the expected format
                $contributors[] = [
                    'id' => $contributor['orcid'] ?? $id,
                    'orcid' => $contributor['orcid'] ?? null,
                    'firstName' => $contributor['firstName'] ?? $contributor['first_name'] ?? '',
                    'lastName' => $contributor['lastName'] ?? $contributor['last_name'] ?? '',
                    'git' => $contributor['git'] ?? null
                ];
            }

            return $this->json($contributors);
        } catch (\Exception $e) {
            $this->logger->error('Error fetching contributors: ' . $e->getMessage());
            return $this->json([], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
