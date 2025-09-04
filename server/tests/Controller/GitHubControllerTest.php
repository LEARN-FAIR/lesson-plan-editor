<?php

namespace App\Tests\Controller;

use App\Controller\GitHubController;
use App\Service\GitHubService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\HeaderBag;

class GitHubControllerTest extends TestCase
{
    private $githubService;
    private $controller;

    protected function setUp(): void
    {
        $this->githubService = $this->createMock(GitHubService::class);
        $this->controller = new GitHubController($this->githubService);
    }

    public function testGetUserInfoWithValidToken()
    {
        // Mock the request
        $request = $this->createMock(Request::class);
        
        // Mock the headers with Authorization token
        $request->headers = new HeaderBag([
            'Authorization' => 'Bearer test_token'
        ]);

        // Mock the GitHub service to return a token
        $this->githubService->expects($this->once())
            ->method('extractTokenFromRequest')
            ->with($request)
            ->willReturn('test_token');

        // Mock the GitHub service to return user info
        $mockUserInfo = [
            'login' => 'testuser',
            'name' => 'Test User',
            'avatarUrl' => 'https://github.com/avatar.png',
            'email' => 'test@example.com'
        ];

        $this->githubService->expects($this->once())
            ->method('getUserInfo')
            ->with('test_token')
            ->willReturn($mockUserInfo);

        // Call the controller method
        $response = $this->controller->getUserInfo($request);

        // Assert response
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
        $this->assertJson($response->getContent());
        
        $responseData = json_decode($response->getContent(), true);
        $this->assertEquals($mockUserInfo, $responseData);
    }

    public function testGetRepositoriesWithValidToken()
    {
        // Mock the request with query parameters
        $request = $this->createMock(Request::class);
        $request->query = new \Symfony\Component\HttpFoundation\ParameterBag([
            'q' => 'test-query'
        ]);
        
        // Mock the headers with Authorization token
        $request->headers = new HeaderBag([
            'Authorization' => 'Bearer test_token'
        ]);

        // Mock the GitHub service to return a token
        $this->githubService->expects($this->once())
            ->method('extractTokenFromRequest')
            ->with($request)
            ->willReturn('test_token');

        // Mock the GitHub service to return repositories
        $mockRepositories = [
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
        ];

        $this->githubService->expects($this->once())
            ->method('searchRepositories')
            ->with('test_token', 'test-query')
            ->willReturn($mockRepositories);

        // Call the controller method
        $response = $this->controller->getRepositories($request);

        // Assert response
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
        $this->assertJson($response->getContent());
        
        $responseData = json_decode($response->getContent(), true);
        $this->assertEquals($mockRepositories, $responseData);
    }

    public function testCheckRepositoryAccessWithValidToken()
    {
        // Mock the request with query parameters
        $request = $this->createMock(Request::class);
        $request->query = new \Symfony\Component\HttpFoundation\ParameterBag([
            'owner' => 'testuser',
            'repo' => 'test-repo'
        ]);
        
        // Mock the headers with Authorization token
        $request->headers = new HeaderBag([
            'Authorization' => 'Bearer test_token'
        ]);

        // Mock the GitHub service to return a token
        $this->githubService->expects($this->once())
            ->method('extractTokenFromRequest')
            ->with($request)
            ->willReturn('test_token');

        // Mock the GitHub service to return repository access info
        $mockAccessInfo = [
            'hasAccess' => true,
            'hasWriteAccess' => true,
            'repository' => [
                'id' => 123,
                'name' => 'test-repo',
                'full_name' => 'testuser/test-repo'
            ],
            'branches' => [
                [
                    'name' => 'main',
                    'commit' => [
                        'sha' => 'abc123'
                    ]
                ]
            ]
        ];

        $this->githubService->expects($this->once())
            ->method('checkRepositoryAccess')
            ->with('test_token', 'testuser', 'test-repo')
            ->willReturn($mockAccessInfo);

        // Call the controller method
        $response = $this->controller->checkRepositoryAccess($request);

        // Assert response
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
        $this->assertJson($response->getContent());
        
        $responseData = json_decode($response->getContent(), true);
        $this->assertEquals($mockAccessInfo, $responseData);
    }

    public function testMissingTokenReturnsUnauthorized()
    {
        // Mock the request with no token
        $request = $this->createMock(Request::class);
        $request->headers = new HeaderBag([]);

        // Mock the GitHub service to return null (no token)
        $this->githubService->expects($this->once())
            ->method('extractTokenFromRequest')
            ->with($request)
            ->willReturn(null);

        // Call the controller method
        $response = $this->controller->getUserInfo($request);

        // Assert response is unauthorized
        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
        $this->assertJson($response->getContent());
        
        $responseData = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $responseData);
    }
}
