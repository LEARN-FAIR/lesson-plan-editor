<?php

namespace App\Tests\Service;

use App\Service\GitHubService;
use App\Service\LessonPlanManagerService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

class LessonPlanManagerServiceTest extends TestCase
{
    private $mockHttpClient;
    private $githubService;
    private $lessonPlanManagerService;

    protected function setUp(): void
    {
        $this->mockHttpClient = new MockHttpClient();
        $this->githubService = $this->createMock(GitHubService::class);
        $this->lessonPlanManagerService = new LessonPlanManagerService($this->mockHttpClient, $this->githubService);
    }

    public function testGetLessonPlans()
    {
        // Mock the response from GitHub API for contents
        $contentsData = [
            [
                'name' => 'test-lesson.md',
                'path' => 'test-lesson.md',
                'sha' => 'abc123',
                'type' => 'file',
                'html_url' => 'https://github.com/testuser/test-repo/blob/main/test-lesson.md'
            ],
            [
                'name' => 'not-a-lesson.txt',
                'path' => 'not-a-lesson.txt',
                'sha' => 'def456',
                'type' => 'file',
                'html_url' => 'https://github.com/testuser/test-repo/blob/main/not-a-lesson.txt'
            ],
            [
                'name' => 'subfolder',
                'path' => 'subfolder',
                'sha' => 'ghi789',
                'type' => 'dir',
                'html_url' => 'https://github.com/testuser/test-repo/tree/main/subfolder'
            ]
        ];
        
        // Mock the GitHub service to return the contents
        $this->githubService->expects($this->once())
            ->method('getRepositoryContents')
            ->with('test_token', 'testuser', 'test-repo', '', 'main')
            ->willReturn($contentsData);
        
        // Test the method
        $lessonPlans = $this->lessonPlanManagerService->getLessonPlans('testuser', 'test-repo', 'main', 'test_token');
        
        // We should only get the markdown file as a lesson plan
        $this->assertCount(1, $lessonPlans);
        $this->assertEquals('test-lesson.md', $lessonPlans[0]['name']);
        $this->assertEquals('abc123', $lessonPlans[0]['sha']);
    }

    public function testGetLessonPlan()
    {
        // Mock the response from GitHub API for file content
        $fileData = [
            'name' => 'test-lesson.md',
            'path' => 'test-lesson.md',
            'sha' => 'abc123',
            'content' => base64_encode('# Test Lesson Plan'),
            'encoding' => 'base64',
            'html_url' => 'https://github.com/testuser/test-repo/blob/main/test-lesson.md'
        ];
        
        // Mock the GitHub service to return the file content
        $this->githubService->expects($this->once())
            ->method('getFileContent')
            ->with('test_token', 'testuser', 'test-repo', 'test-lesson.md', 'main')
            ->willReturn($fileData);
        
        // Test the method
        $lessonPlan = $this->lessonPlanManagerService->getLessonPlan('testuser', 'test-repo', 'test-lesson.md', 'main', 'test_token');
        
        $this->assertEquals('test-lesson.md', $lessonPlan['name']);
        $this->assertEquals('abc123', $lessonPlan['sha']);
        $this->assertEquals(base64_encode('# Test Lesson Plan'), $lessonPlan['content']);
        $this->assertEquals('# Test Lesson Plan', $lessonPlan['decoded_content']);
    }

    public function testSaveLessonPlan()
    {
        $content = '# Updated Test Lesson Plan';
        $encodedContent = base64_encode($content);
        
        // Mock the response for getting the file (to check if it exists)
        $this->githubService->expects($this->once())
            ->method('getFileContent')
            ->with('test_token', 'testuser', 'test-repo', 'test-lesson.md', 'main')
            ->willReturn([
                'sha' => 'abc123',
                'content' => base64_encode('# Test Lesson Plan'),
                'encoding' => 'base64'
            ]);
        
        // Mock the response for updating the file
        $updateResponse = [
            'content' => [
                'name' => 'test-lesson.md',
                'path' => 'test-lesson.md',
                'sha' => 'new_sha_123',
                'content' => $encodedContent,
                'encoding' => 'base64',
                'html_url' => 'https://github.com/testuser/test-repo/blob/main/test-lesson.md'
            ]
        ];
        
        $this->githubService->expects($this->once())
            ->method('updateFile')
            ->with(
                'test_token',
                'testuser',
                'test-repo',
                'test-lesson.md',
                $content,
                'Update test lesson plan',
                'abc123',
                'main'
            )
            ->willReturn($updateResponse);
        
        // Test the method
        $result = $this->lessonPlanManagerService->saveLessonPlan(
            'testuser',
            'test-repo',
            'test-lesson.md',
            $content,
            'Update test lesson plan',
            'main',
            'test_token'
        );
        
        $this->assertEquals('test-lesson.md', $result['name']);
        $this->assertEquals('new_sha_123', $result['sha']);
        $this->assertEquals($encodedContent, $result['content']);
    }

    public function testSaveLessonPlanNewFile()
    {
        $content = '# New Test Lesson Plan';
        $encodedContent = base64_encode($content);
        
        // Mock the response for getting the file (file doesn't exist)
        $this->githubService->expects($this->once())
            ->method('getFileContent')
            ->with('test_token', 'testuser', 'test-repo', 'new-lesson.md', 'main')
            ->willThrowException(new \Exception('File not found'));
        
        // Mock the response for creating the file
        $createResponse = [
            'content' => [
                'name' => 'new-lesson.md',
                'path' => 'new-lesson.md',
                'sha' => 'new_file_sha',
                'content' => $encodedContent,
                'encoding' => 'base64',
                'html_url' => 'https://github.com/testuser/test-repo/blob/main/new-lesson.md'
            ]
        ];
        
        $this->githubService->expects($this->once())
            ->method('createFile')
            ->with(
                'test_token',
                'testuser',
                'test-repo',
                'new-lesson.md',
                $content,
                'Create new test lesson plan',
                'main'
            )
            ->willReturn($createResponse);
        
        // Test the method
        $result = $this->lessonPlanManagerService->saveLessonPlan(
            'testuser',
            'test-repo',
            'new-lesson.md',
            $content,
            'Create new test lesson plan',
            'main',
            'test_token'
        );
        
        $this->assertEquals('new-lesson.md', $result['name']);
        $this->assertEquals('new_file_sha', $result['sha']);
        $this->assertEquals($encodedContent, $result['content']);
    }
}
