<?php

namespace App\Tests\Service;

use App\Service\GitHubService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\HeaderBag;

class GitHubServiceTest extends TestCase
{
    private $mockHttpClient;
    private $githubService;

    protected function setUp(): void
    {
        $this->mockHttpClient = new MockHttpClient();
        $this->githubService = new GitHubService($this->mockHttpClient, 'test_client_id', 'test_client_secret', 'https://localhost:3000/oauth/callback');
    }

    public function testExtractTokenFromRequest()
    {
        // Create a mock request with Authorization header
        $request = $this->createMock(Request::class);
        $request->headers = new HeaderBag([
            'Authorization' => 'Bearer test_token'
        ]);

        // Test token extraction
        $token = $this->githubService->extractTokenFromRequest($request);
        $this->assertEquals('test_token', $token);

        // Test with no Authorization header
        $request->headers = new HeaderBag([]);
        $token = $this->githubService->extractTokenFromRequest($request);
        $this->assertNull($token);

        // Test with malformed Authorization header
        $request->headers = new HeaderBag([
            'Authorization' => 'Malformed test_token'
        ]);
        $token = $this->githubService->extractTokenFromRequest($request);
        $this->assertNull($token);
    }

    public function testGetOAuthUrl()
    {
        $url = $this->githubService->getOAuthUrl();
        $this->assertStringContainsString('https://github.com/login/oauth/authorize', $url);
        $this->assertStringContainsString('client_id=test_client_id', $url);
        $this->assertStringContainsString('redirect_uri=', $url);
    }

    public function testGetAccessToken()
    {
        // Mock the response from GitHub
        $responseData = ['access_token' => 'test_access_token'];
        $mockResponse = new MockResponse(json_encode($responseData), [
            'http_code' => 200,
            'response_headers' => ['Content-Type: application/json'],
        ]);
        
        $this->mockHttpClient->setResponseFactory($mockResponse);
        
        // Test the method
        $token = $this->githubService->getAccessToken('test_code');
        $this->assertEquals('test_access_token', $token);
    }

    public function testGetUserInfo()
    {
        // Mock the response from GitHub
        $userData = [
            'login' => 'testuser',
            'name' => 'Test User',
            'avatar_url' => 'https://github.com/avatar.png',
            'email' => 'test@example.com'
        ];
        
        $mockResponse = new MockResponse(json_encode($userData), [
            'http_code' => 200,
            'response_headers' => ['Content-Type: application/json'],
        ]);
        
        $this->mockHttpClient->setResponseFactory($mockResponse);
        
        // Test the method
        $userInfo = $this->githubService->getUserInfo('test_token');
        
        $this->assertEquals('testuser', $userInfo['login']);
        $this->assertEquals('Test User', $userInfo['name']);
        $this->assertEquals('https://github.com/avatar.png', $userInfo['avatarUrl']);
        $this->assertEquals('test@example.com', $userInfo['email']);
    }

    public function testSearchRepositories()
    {
        // Mock the response from GitHub
        $repoData = [
            'items' => [
                [
                    'id' => 123,
                    'name' => 'test-repo',
                    'full_name' => 'testuser/test-repo',
                    'owner' => [
                        'login' => 'testuser',
                        'avatar_url' => 'https://github.com/avatar.png'
                    ],
                    'html_url' => 'https://github.com/testuser/test-repo'
                ]
            ]
        ];
        
        $mockResponse = new MockResponse(json_encode($repoData), [
            'http_code' => 200,
            'response_headers' => ['Content-Type: application/json'],
        ]);
        
        $this->mockHttpClient->setResponseFactory($mockResponse);
        
        // Test the method
        $repos = $this->githubService->searchRepositories('test_token', 'test-query');
        
        $this->assertCount(1, $repos);
        $this->assertEquals('test-repo', $repos[0]['name']);
        $this->assertEquals('testuser/test-repo', $repos[0]['full_name']);
    }

    public function testCheckRepositoryAccess()
    {
        // Mock the repository response
        $repoData = [
            'id' => 123,
            'name' => 'test-repo',
            'full_name' => 'testuser/test-repo',
            'permissions' => [
                'push' => true
            ]
        ];
        
        $mockRepoResponse = new MockResponse(json_encode($repoData), [
            'http_code' => 200,
            'response_headers' => ['Content-Type: application/json'],
        ]);
        
        // Mock the branches response
        $branchesData = [
            [
                'name' => 'main',
                'commit' => [
                    'sha' => 'abc123'
                ]
            ]
        ];
        
        $mockBranchesResponse = new MockResponse(json_encode($branchesData), [
            'http_code' => 200,
            'response_headers' => ['Content-Type: application/json'],
        ]);
        
        $this->mockHttpClient->setResponseFactory([$mockRepoResponse, $mockBranchesResponse]);
        
        // Test the method
        $accessInfo = $this->githubService->checkRepositoryAccess('test_token', 'testuser', 'test-repo');
        
        $this->assertTrue($accessInfo['hasAccess']);
        $this->assertTrue($accessInfo['hasWriteAccess']);
        $this->assertEquals('test-repo', $accessInfo['repository']['name']);
        $this->assertEquals('main', $accessInfo['branches'][0]['name']);
    }
}
