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
        
        $defaultBranch = $response['default_branch'] ?? null;
        
        if (!$defaultBranch) {
            throw new \RuntimeException('Repository does not have a default branch');
        }
        
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

            // The directory listing does not include file contents, so the
            // frontmatter title is not yet known. Fetch all titles in a single
            // GraphQL request so the UI can display the real title rather than
            // the filename.
            $this->populateTitles($lessonPlans, $accessToken, $owner, $repo, $branch);

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
     * Get file content from GitHub
     */
    public function getFileContent(string $accessToken, string $owner, string $repo, string $path, ?string $branch = null): array
    {
        $response = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/contents/{$path}", $accessToken, [
            'ref' => $branch
        ]);
        
        if (is_array($response) && !isset($response['type'])) {
            throw new HttpException(Response::HTTP_BAD_REQUEST, 'Expected a file, got a directory');
        }
        
        $content = $response['content'] ?? null;
        $decodedContent = $content ? base64_decode($content) : null;
        
        return [
            'content' => $decodedContent,
            'sha' => $response['sha'] ?? null
        ];
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
     * Commit multiple files in a single commit using the Git Data API
     * This is used to commit both lesson plan and contributors file together
     */
    public function commitMultipleFiles(
        string $accessToken,
        string $owner,
        string $repo,
        array $files, // Array of ['path' => string, 'content' => string]
        string $commitMessage,
        ?string $branch = null
    ): array {
        // Get the default branch if not specified
        if (!$branch) {
            $repoInfo = $this->makeRequest('GET', "/repos/{$owner}/{$repo}", $accessToken);
            $branch = $repoInfo['default_branch'] ?? 'main';
        }
        
        // Get the latest commit SHA on the branch
        $refResponse = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/git/ref/heads/{$branch}", $accessToken);
        $latestCommitSha = $refResponse['object']['sha'];
        
        // Get the tree SHA from the latest commit
        $commitResponse = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/git/commits/{$latestCommitSha}", $accessToken);
        $baseTreeSha = $commitResponse['tree']['sha'];
        
        // Create blobs for each file
        $treeItems = [];
        foreach ($files as $file) {
            $blobResponse = $this->makeRequest('POST', "/repos/{$owner}/{$repo}/git/blobs", $accessToken, [
                'content' => $file['content'],
                'encoding' => 'utf-8'
            ]);
            
            $treeItems[] = [
                'path' => $file['path'],
                'mode' => '100644', // Regular file
                'type' => 'blob',
                'sha' => $blobResponse['sha']
            ];
        }
        
        // Create a new tree
        $treeResponse = $this->makeRequest('POST', "/repos/{$owner}/{$repo}/git/trees", $accessToken, [
            'base_tree' => $baseTreeSha,
            'tree' => $treeItems
        ]);
        
        // Create a new commit
        $newCommitResponse = $this->makeRequest('POST', "/repos/{$owner}/{$repo}/git/commits", $accessToken, [
            'message' => $commitMessage,
            'tree' => $treeResponse['sha'],
            'parents' => [$latestCommitSha]
        ]);
        
        // Update the reference
        $this->makeRequest('PATCH', "/repos/{$owner}/{$repo}/git/refs/heads/{$branch}", $accessToken, [
            'sha' => $newCommitResponse['sha']
        ]);
        
        return [
            'commit' => $newCommitResponse
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
     * Set the frontmatter title on each LessonPlan.
     *
     * The REST directory listing does not include file contents, so titles are
     * unknown after enumeration. Rather than fetching each file individually,
     * a single GraphQL query retrieves every lesson plan's file text by path
     * for the selected branch, keeping the title list branch-accurate.
     *
     * @param LessonPlan[] $lessonPlans
     */
    private function populateTitles(array $lessonPlans, string $accessToken, string $owner, string $repo, ?string $branch = null): void
    {
        if (empty($lessonPlans)) {
            return;
        }

        // GraphQL resolves a file by a "ref:path" expression; fall back to the
        // repository default (HEAD) when no branch was provided.
        $ref = $branch ?: 'HEAD';

        // Build one query that aliases every lesson plan's blob text by path.
        $fields = [];
        $aliasToIndex = [];
        foreach ($lessonPlans as $index => $lessonPlan) {
            $alias = 'f' . $index;
            $aliasToIndex[$alias] = $index;
            // json_encode produces a properly-escaped GraphQL string literal.
            $expression = json_encode($ref . ':' . $lessonPlan->getPath());
            $fields[] = "{$alias}: object(expression: {$expression}) { ... on Blob { text } }";
        }

        $query = sprintf(
            'query { repository(owner: %s, name: %s) { %s } }',
            json_encode($owner),
            json_encode($repo),
            implode(' ', $fields)
        );

        try {
            $response = $this->makeRequest('POST', '/graphql', $accessToken, ['query' => $query]);
            $repository = $response['data']['repository'] ?? null;

            if (!is_array($repository)) {
                return;
            }

            foreach ($repository as $alias => $object) {
                if (!isset($aliasToIndex[$alias]) || !is_array($object)) {
                    continue;
                }

                $title = $this->extractFrontmatterTitle((string) ($object['text'] ?? ''));
                if ($title !== null) {
                    $lessonPlans[$aliasToIndex[$alias]]->setTitle($title);
                }
            }
        } catch (\Exception $e) {
            // Leave titles unset; the UI falls back to the filename.
        }
    }

    /**
     * Extract the `title` value from a markdown file's YAML frontmatter.
     * Only matches a top-level (column 0) key so indented `title:` entries
     * inside e.g. additionalResources are ignored.
     */
    private function extractFrontmatterTitle(string $content): ?string
    {
        if (preg_match('/^title:\s*(.+?)\s*$/m', $content, $match)) {
            return trim($match[1], " \t\"'");
        }

        return null;
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
     * or forks of this repository (including forks of forks)
     */
    public function getTargetRepoAndForks(string $accessToken): array
    {
        // Get all user repositories
        $allRepositories = $this->getUserRepositories($accessToken);
        
        // Target repository full name
        $targetRepoFullName = 'elixir-europe-training/ELIXIR-TrP-FAIR-Converge';
        $targetRepoName = 'ELIXIR-TrP-FAIR-Converge';
        
        // Filter repositories
        $filteredRepositories = [];
        $potentialForks = [];
        
        // First pass: identify the target repo and potential forks
        foreach ($allRepositories as $repo) {
            // Include the target repository itself
            if ($repo['full_name'] === $targetRepoFullName) {
                $filteredRepositories[] = $repo;
                continue;
            }
            
            // Collect potential forks for further inspection
            if ($repo['fork'] || $repo['name'] === $targetRepoName) {
                $potentialForks[] = $repo;
            }
        }
        
        // Second pass: fetch detailed info for each potential fork
        foreach ($potentialForks as $repo) {
            try {
                // Get detailed repository information
                $detailedRepo = $this->makeRequest('GET', "/repos/{$repo['full_name']}", $accessToken);
                
                // Check if this is a fork of the target repo (directly or indirectly)
                if ($this->isRelatedToTargetRepo($detailedRepo, $targetRepoFullName)) {
                    $filteredRepositories[] = $detailedRepo;
                }
            } catch (\Exception $e) {
                // Skip repositories we can't access
                continue;
            }
        }
        
        return $filteredRepositories;
    }
    
    /**
     * Check if a repository is related to the target repository
     * This checks the entire fork lineage to find any connection to the target
     */
    private function isRelatedToTargetRepo(array $repo, string $targetRepoFullName): bool
    {
        // Direct match
        if ($repo['full_name'] === $targetRepoFullName) {
            return true;
        }
        
        // Not a fork
        if (!isset($repo['fork']) || $repo['fork'] !== true) {
            return false;
        }
        
        // Check parent
        if (isset($repo['parent']) && is_array($repo['parent'])) {
            if ($repo['parent']['full_name'] === $targetRepoFullName) {
                return true;
            }
        }
        
        // Check source (for forks of forks)
        if (isset($repo['source']) && is_array($repo['source'])) {
            if ($repo['source']['full_name'] === $targetRepoFullName) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get commits for a branch
     * 
     * @param string $accessToken GitHub access token
     * @param string $owner Repository owner
     * @param string $repo Repository name
     * @param string $branch Branch name
     * @param int $perPage Number of commits per page (default: 30)
     * @return array List of commits
     */
    public function getBranchCommits(string $accessToken, string $owner, string $repo, string $branch, int $perPage = 30): array
    {
        try {
            $response = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/commits", $accessToken, [
                'sha' => $branch,
                'per_page' => $perPage
            ]);
            
            $commits = [];
            foreach ($response as $commit) {
                $commits[] = [
                    'sha' => $commit['sha'],
                    'commit' => [
                        'message' => $commit['commit']['message'] ?? '',
                        'author' => $commit['commit']['author'] ?? [],
                        'committer' => $commit['commit']['committer'] ?? []
                    ],
                    'author' => $commit['author'] ?? [],
                    'committer' => $commit['committer'] ?? [],
                    'html_url' => $commit['html_url'] ?? ''
                ];
            }
            
            return $commits;
        } catch (\Exception $e) {
            // If there's an error (e.g., branch doesn't exist), return an empty array
            return [];
        }
    }

    /**
     * Create a new branch from a source branch
     * 
     * @param string $accessToken GitHub access token
     * @param string $owner Repository owner
     * @param string $repo Repository name
     * @param string $branchName Name of the new branch to create
     * @param string $sourceBranch Name of the source branch (e.g., 'main')
     * @return array Branch creation response
     */
    public function createBranch(string $accessToken, string $owner, string $repo, string $branchName, string $sourceBranch): array
    {
        // First, get the SHA of the source branch
        $sourceRef = $this->makeRequest('GET', "/repos/{$owner}/{$repo}/git/ref/heads/{$sourceBranch}", $accessToken);
        $sourceSha = $sourceRef['object']['sha'];
        
        // Create the new branch reference
        $response = $this->makeRequest('POST', "/repos/{$owner}/{$repo}/git/refs", $accessToken, [
            'ref' => "refs/heads/{$branchName}",
            'sha' => $sourceSha
        ]);
        
        return $response;
    }
}
