<?php

namespace App\Tests\Controller;

use App\Controller\LessonPlanController;
use App\Service\GitHubService;
use App\Service\LessonPlanManagerService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\HeaderBag;

class LessonPlanControllerTest extends TestCase
{
    private $githubService;
    private $lessonPlanManagerService;
    private $controller;

    protected function setUp(): void
    {
        $this->githubService = $this->createMock(GitHubService::class);
        $this->lessonPlanManagerService = $this->createMock(LessonPlanManagerService::class);
        $this->controller = new LessonPlanController($this->githubService, $this->lessonPlanManagerService);
    }

    public function testListLessonPlansWithValidToken()
    {
        // Mock the request with query parameters
        $request = $this->createMock(Request::class);
        $request->query = new \Symfony\Component\HttpFoundation\ParameterBag([
            'owner' => 'testOwner',
            'repo' => 'testRepo',
            'branch' => 'main'
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

        // Mock the LessonPlanManagerService to return lesson plans
        $mockLessonPlans = [
            [
                'name' => 'Test Lesson Plan',
                'path' => 'test-path.md',
                'sha' => 'abc123',
                'content' => null,
                'html_url' => 'https://github.com/testOwner/testRepo/blob/main/test-path.md'
            ]
        ];

        $this->lessonPlanManagerService->expects($this->once())
            ->method('getLessonPlans')
            ->with('testOwner', 'testRepo', 'main', 'test_token')
            ->willReturn($mockLessonPlans);

        // Call the controller method
        $response = $this->controller->listLessonPlans($request);

        // Assert response
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
        $this->assertJson($response->getContent());
        
        $responseData = json_decode($response->getContent(), true);
        $this->assertEquals($mockLessonPlans, $responseData);
    }

    public function testGetLessonPlanWithValidToken()
    {
        // Mock the request with query parameters
        $request = $this->createMock(Request::class);
        $request->query = new \Symfony\Component\HttpFoundation\ParameterBag([
            'owner' => 'testOwner',
            'repo' => 'testRepo',
            'path' => 'test-path.md',
            'branch' => 'main'
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

        // Mock the LessonPlanManagerService to return a lesson plan
        $mockLessonPlan = [
            'name' => 'Test Lesson Plan',
            'path' => 'test-path.md',
            'sha' => 'abc123',
            'content' => 'encoded_content',
            'decoded_content' => '# Test Lesson Plan',
            'html_url' => 'https://github.com/testOwner/testRepo/blob/main/test-path.md'
        ];

        $this->lessonPlanManagerService->expects($this->once())
            ->method('getLessonPlan')
            ->with('testOwner', 'testRepo', 'test-path.md', 'main', 'test_token')
            ->willReturn($mockLessonPlan);

        // Call the controller method
        $response = $this->controller->getLessonPlan($request);

        // Assert response
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
        $this->assertJson($response->getContent());
        
        $responseData = json_decode($response->getContent(), true);
        $this->assertEquals($mockLessonPlan, $responseData);
    }

    public function testSaveLessonPlanWithValidToken()
    {
        // Create request content
        $requestContent = json_encode([
            'owner' => 'testOwner',
            'repo' => 'testRepo',
            'path' => 'test-path.md',
            'content' => '# Updated Test Lesson Plan',
            'commitMessage' => 'Update test lesson plan',
            'branch' => 'main'
        ]);

        // Mock the request
        $request = $this->createMock(Request::class);
        $request->method('getContent')->willReturn($requestContent);
        
        // Mock the headers with Authorization token
        $request->headers = new HeaderBag([
            'Authorization' => 'Bearer test_token'
        ]);

        // Mock the GitHub service to return a token
        $this->githubService->expects($this->once())
            ->method('extractTokenFromRequest')
            ->with($request)
            ->willReturn('test_token');

        // Mock the LessonPlanManagerService to return the saved lesson plan
        $mockSavedLessonPlan = [
            'name' => 'Test Lesson Plan',
            'path' => 'test-path.md',
            'sha' => 'new_sha_123',
            'content' => 'new_encoded_content',
            'html_url' => 'https://github.com/testOwner/testRepo/blob/main/test-path.md'
        ];

        $this->lessonPlanManagerService->expects($this->once())
            ->method('saveLessonPlan')
            ->with(
                'testOwner',
                'testRepo',
                'test-path.md',
                '# Updated Test Lesson Plan',
                'Update test lesson plan',
                'main',
                'test_token',
                null
            )
            ->willReturn($mockSavedLessonPlan);

        // Call the controller method
        $response = $this->controller->saveLessonPlan($request);

        // Assert response
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
        $this->assertJson($response->getContent());
        
        $responseData = json_decode($response->getContent(), true);
        $this->assertEquals($mockSavedLessonPlan, $responseData);
    }

    public function testMissingTokenReturnsUnauthorized()
    {
        // Mock the request with query parameters but no token
        $request = $this->createMock(Request::class);
        $request->query = new \Symfony\Component\HttpFoundation\ParameterBag([
            'owner' => 'testOwner',
            'repo' => 'testRepo',
            'branch' => 'main'
        ]);
        
        $request->headers = new HeaderBag([]);

        // Mock the GitHub service to return null (no token)
        $this->githubService->expects($this->once())
            ->method('extractTokenFromRequest')
            ->with($request)
            ->willReturn(null);

        // Call the controller method
        $response = $this->controller->listLessonPlans($request);

        // Assert response is unauthorized
        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
        $this->assertJson($response->getContent());
        
        $responseData = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $responseData);
    }
}
