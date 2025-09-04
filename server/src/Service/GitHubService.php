<?php

namespace App\Service;

use App\Model\Category;
use App\Model\GitHubUser;
use App\Model\LessonPlan;
use App\Model\Repository;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GitHubService
{
    private const LESSON_PLANS_FOLDER = '_lesson-plans';
    private HttpClientInterface $httpClient;
    private string $apiBaseUrl = 'https://api.github.com';

    public function __construct(HttpClientInterface $httpClient = null)
    {
        $this->httpClient = $httpClient ?? HttpClient::create();
    }

    /**
     * Get user information from GitHub API
     */
    public function getUserInfo(string $accessToken): GitHubUser
    {
        $response = $this->makeRequest('GET', '/user', $accessToken);
        
        $userData = $response;
        
        return new GitHubUser(
            $userData['id'] ?? null,
            $userData['login'] ?? null,
            $userData['name'] ?? null,
            $userData['email'] ?? null,
            $userData['avatar_url'] ?? null,
            $userData['html_url'] ?? null,
            $accessToken
        );
    }

    /**
     * Get repositories for the authenticated user
     */
    public function getUserRepositories(string $accessToken): array
    {
        $response = $this->makeRequest('GET', '/user/repos', $accessToken, [
            'sort' => 'updated',
            'per_page' => 100
        ]);
        
        $repositories = [];
        foreach ($response as $repo) {
            $repositories[] = [
                'id' => $repo['id'],
                'name' => $repo['name'],
                'full_name' => $repo['full_name'],
                'owner' => [
                    'login' => $repo['owner']['login'],
                    'avatar_url' => $repo['owner']['avatar_url']
                ],
                'html_url' => $repo['html_url'],
                'description' => $repo['description'],
                'default_branch' => $repo['default_branch'],
                'fork' => $repo['fork'] ?? false,
                'source' => $repo['source'] ?? null,
                'parent' => $repo['parent'] ?? null,
                'permissions' => $repo['permissions'] ?? []
            ];
        }
        
        return $repositories;
    }

    /**
     * Check if user has write access to a repository
     */
    public function checkRepositoryAccess(string $accessToken, string $owner, string $repo): Repository
    {
        $response = $this->makeRequest('GET', "/repos/{$owner}/{$repo}", $accessToken);
        
        $defaultBranch = $response['default_branch'] ?? 'main';
        
        // Check permissions
        $hasWriteAccess = false;
        if (isset($response['permissions'])) {
            $hasWriteAccess = $response['permissions']['push'] ?? false;
        }
        
        // Get branches
        $branchesResponse = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/branches", $accessToken);
        
        $branches = [];
        foreach ($branchesResponse as $branch) {
            $branches[] = $branch['name'];
        }
        
        return new Repository(
            $owner,
            $repo,
            $defaultBranch,
            $defaultBranch,
            $hasWriteAccess,
            $branches
        );
    }

    /**
     * Get all lesson plans from a repository
     */
    public function getLessonPlans(string $accessToken, string $owner, string $repo, ?string $branch = null): array
    {
        try {
            $response = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/contents/" . self::LESSON_PLANS_FOLDER, $accessToken, [
                'ref' => $branch
            ]);
            
            $lessonPlans = [];
            
            // Process each item in the lesson plans folder
            foreach ($response as $item) {
                if ($item['type'] === 'dir') {
                    // This is a category folder
                    $categoryInfo = $this->getCategoryInfo($accessToken, $owner, $repo, $item['path'], $branch);
                    
                    // Get the contents of the topics folder within this category
                    try {
                        $topicsPath = "{$item['path']}/topics";
                        $topicsResponse = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/contents/{$topicsPath}", $accessToken, [
                            'ref' => $branch
                        ]);
                        
                        // Process each lesson plan in the topics folder
                        foreach ($topicsResponse as $topicFile) {
                            if ($topicFile['type'] === 'file' && $this->endsWith($topicFile['name'], '.md')) {
                                $content = $topicFile['content'] ?? null;
                                $decodedContent = $content ? base64_decode($content) : null;
                                
                                $lessonPlans[] = new LessonPlan(
                                    $topicFile['name'],
                                    $topicFile['path'],
                                    $topicFile['sha'],
                                    $content,
                                    $decodedContent,
                                    $topicFile['html_url'] ?? '',
                                    $categoryInfo
                                );
                            }
                        }
                    } catch (\Exception $e) {
                        // Continue with other categories even if one fails
                    }
                } elseif ($item['type'] === 'file' && $this->endsWith($item['name'], '.md') && $item['name'] !== 'index.md') {
                    // Also include any markdown files directly in the _lesson-plans folder (except index.md)
                    $content = $item['content'] ?? null;
                    $decodedContent = $content ? base64_decode($content) : null;
                    
                    $lessonPlans[] = new LessonPlan(
                        $item['name'],
                        $item['path'],
                        $item['sha'],
                        $content,
                        $decodedContent,
                        $item['html_url'] ?? ''
                    );
                }
            }
            
            return $lessonPlans;
        } catch (\Exception $e) {
            // If the folder doesn't exist, return an empty array
            if ($e instanceof HttpException && $e->getStatusCode() === Response::HTTP_NOT_FOUND) {
                return [];
            }
            
            throw $e;
        }
    }

    /**
     * Get a specific lesson plan by path
     */
    public function getLessonPlan(string $accessToken, string $owner, string $repo, string $path, ?string $branch = null): LessonPlan
    {
        $response = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/contents/{$path}", $accessToken, [
            'ref' => $branch
        ]);
        
        if (is_array($response) && !isset($response['type'])) {
            throw new HttpException(Response::HTTP_BAD_REQUEST, 'Expected a file, got a directory');
        }
        
        $content = $response['content'] ?? null;
        $decodedContent = $content ? base64_decode($content) : null;
        
        return new LessonPlan(
            $response['name'],
            $response['path'],
            $response['sha'],
            $content,
            $decodedContent,
            $response['html_url'] ?? ''
        );
    }

    /**
     * Create or update a file in a repository
     */
    public function commitFile(
        string $accessToken,
        string $owner,
        string $repo,
        string $path,
        string $content,
        string $commitMessage,
        ?string $sha = null,
        ?string $branch = null
    ): array {
        $params = [
            'message' => $commitMessage,
            'content' => base64_encode($content),
            'branch' => $branch
        ];
        
        if ($sha) {
            $params['sha'] = $sha;
        }
        
        $response = $this->makeRequest('PUT', "/repos/{$owner}/{$repo}/contents/{$path}", $accessToken, $params);
        
        return [
            'content' => $response['content'] ?? [],
            'commit' => $response['commit'] ?? []
        ];
    }

    /**
     * Parse category information from index.md file
     */
    private function getCategoryInfo(
        string $accessToken,
        string $owner,
        string $repo,
        string $categoryPath,
        ?string $branch = null
    ): ?Category {
        try {
            $response = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/contents/{$categoryPath}/index.md", $accessToken, [
                'ref' => $branch
            ]);
            
            if (isset($response['content']) && is_string($response['content'])) {
                $content = base64_decode($response['content']);
                
                // Parse the frontmatter
                preg_match('/title:\s*([^\n]+)/i', $content, $titleMatch);
                preg_match('/number:\s*(\d+)/i', $content, $numberMatch);
                
                if (!empty($titleMatch) && !empty($numberMatch)) {
                    return new Category(
                        trim($titleMatch[1]),
                        (int) trim($numberMatch[1])
                    );
                }
            }
            
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Make a request to the GitHub API
     * 
     * @throws HttpException If the request fails
     */
    private function makeRequest(string $method, string $endpoint, string $accessToken, array $params = []): array
    {
        $options = [
            'headers' => [
                'Authorization' => "token {$accessToken}",
                'Accept' => 'application/vnd.github.v3+json',
                'User-Agent' => 'LEARN-FAIR-Lesson-Plan-Editor'
            ]
        ];
        
        if ($method === 'GET' && !empty($params)) {
            $endpoint .= '?' . http_build_query($params);
        } elseif ($method !== 'GET' && !empty($params)) {
            $options['json'] = $params;
        }
        
        $response = $this->httpClient->request($method, $this->apiBaseUrl . $endpoint, $options);
        
        if ($response->getStatusCode() >= 400) {
            throw new HttpException(
                $response->getStatusCode(),
                'GitHub API error: ' . $response->getContent(false)
            );
        }
        
        return $response->toArray();
    }

    /**
     * Check if a string ends with a specific substring
     */
    private function endsWith(string $haystack, string $needle): bool
    {
        return substr_compare($haystack, $needle, -strlen($needle)) === 0;
    }
    
    /**
     * Get target repository and its forks
     * 
     * Filters repositories to only include elixir-europe-training/ELIXIR-TrP-FAIR-Converge
     * or forks of this repository
     */
    public function getTargetRepoAndForks(string $accessToken): array
    {
        // Get all user repositories
        $allRepositories = $this->getUserRepositories($accessToken);
        
        // Target repository full name
        $targetRepoFullName = 'elixir-europe-training/ELIXIR-TrP-FAIR-Converge';
        
        // Filter repositories
        $filteredRepositories = [];
        
        foreach ($allRepositories as $repo) {
            // Include the target repository itself
            if ($repo['full_name'] === $targetRepoFullName) {
                $filteredRepositories[] = $repo;
                continue;
            }
            
            // For fork repositories, check if they are forks of the target
            if ($repo['fork'] && isset($repo['parent']) && is_array($repo['parent'])) {
                if ($repo['parent']['full_name'] === $targetRepoFullName) {
                    $filteredRepositories[] = $repo;
                    continue;
                }
            }
        }
        
        return $filteredRepositories;
    }
}
