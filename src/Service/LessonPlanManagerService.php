<?php

namespace App\Service;

use App\Model\Category;
use App\Model\LessonPlan;
use App\Model\Repository;

class LessonPlanManagerService
{
    private GitHubService $githubService;
    private MarkdownService $markdownService;

    public function __construct(GitHubService $githubService, MarkdownService $markdownService)
    {
        $this->githubService = $githubService;
        $this->markdownService = $markdownService;
    }

    /**
     * Get all lesson plans with organized categories
     */
    public function getOrganizedLessonPlans(string $token, string $owner, string $repo, ?string $branch = null): array
    {
        $lessonPlans = $this->githubService->getLessonPlans($token, $owner, $repo, $branch);
        
        // Organize lesson plans by category
        $categories = [];
        $uncategorized = [];
        
        foreach ($lessonPlans as $lessonPlan) {
            $category = $lessonPlan->getCategory();
            
            if ($category) {
                $categoryNumber = $category->getNumber() ?? 999;
                $categoryTitle = $category->getTitle() ?? 'Uncategorized';
                
                if (!isset($categories[$categoryNumber])) {
                    $categories[$categoryNumber] = [
                        'title' => $categoryTitle,
                        'number' => $categoryNumber,
                        'lessonPlans' => []
                    ];
                }
                
                $categories[$categoryNumber]['lessonPlans'][] = $lessonPlan->toArray();
            } else {
                $uncategorized[] = $lessonPlan->toArray();
            }
        }
        
        // Sort categories by number
        ksort($categories);
        
        // Convert to indexed array
        $result = array_values($categories);
        
        // Add uncategorized lesson plans if any
        if (!empty($uncategorized)) {
            $result[] = [
                'title' => 'Uncategorized',
                'number' => 999,
                'lessonPlans' => $uncategorized
            ];
        }
        
        return $result;
    }
    
    /**
     * Create a new lesson plan
     */
    public function createLessonPlan(
        string $token, 
        string $owner, 
        string $repo, 
        string $title, 
        ?string $categoryPath = null, 
        ?string $branch = null
    ): LessonPlan {
        // Sanitize title for filename
        $filename = $this->sanitizeFilename($title) . '.md';
        
        // Determine path
        $path = '_lesson-plans/';
        if ($categoryPath) {
            $path .= trim($categoryPath, '/') . '/';
        }
        $path .= $filename;
        
        // Create content with front matter
        $frontMatter = [
            'title' => $title,
            'date' => date('Y-m-d')
        ];
        
        $content = $this->markdownService->generateMarkdownWithFrontMatter(
            $frontMatter, 
            "# $title\n\nAdd your content here."
        );
        
        // Commit the file
        $commitMessage = "Create new lesson plan: $title";
        $result = $this->githubService->commitFile($token, $owner, $repo, $path, $content, $commitMessage, null, $branch);
        
        // Create and return lesson plan object
        $lessonPlan = new LessonPlan();
        $lessonPlan->setName($filename);
        $lessonPlan->setPath($path);
        $lessonPlan->setSha($result['content']['sha'] ?? null);
        $lessonPlan->setContent($content);
        $lessonPlan->setDecodedContent($content);
        $lessonPlan->setHtmlUrl($result['content']['html_url'] ?? null);
        
        if ($categoryPath) {
            // Try to get category info
            try {
                $categoryIndexPath = '_lesson-plans/' . trim($categoryPath, '/') . '/index.md';
                $categoryFile = $this->githubService->getLessonPlan($token, $owner, $repo, $categoryIndexPath, $branch);
                $categoryInfo = $this->markdownService->extractCategoryInfo($categoryFile->getDecodedContent());
                
                $category = new Category();
                $category->setTitle($categoryInfo['title']);
                $category->setNumber($categoryInfo['number']);
                $lessonPlan->setCategory($category);
            } catch (\Exception $e) {
                // Category info not available, continue without it
            }
        }
        
        return $lessonPlan;
    }
    
    /**
     * Update an existing lesson plan
     */
    public function updateLessonPlan(
        string $token, 
        string $owner, 
        string $repo, 
        string $path, 
        string $content, 
        string $commitMessage, 
        ?string $sha = null, 
        ?string $branch = null
    ): array {
        return $this->githubService->commitFile($token, $owner, $repo, $path, $content, $commitMessage, $sha, $branch);
    }
    
    /**
     * Create a new category
     */
    public function createCategory(
        string $token, 
        string $owner, 
        string $repo, 
        string $title, 
        int $number, 
        ?string $branch = null
    ): Category {
        // Sanitize title for folder name
        $folderName = $this->sanitizeFilename($title);
        $path = "_lesson-plans/$folderName/index.md";
        
        // Create content with front matter
        $frontMatter = [
            'title' => $title,
            'number' => $number
        ];
        
        $content = $this->markdownService->generateMarkdownWithFrontMatter(
            $frontMatter, 
            "# $number. $title\n\nCategory description goes here."
        );
        
        // Commit the file
        $commitMessage = "Create new category: $title";
        $this->githubService->commitFile($token, $owner, $repo, $path, $content, $commitMessage, null, $branch);
        
        // Create and return category object
        $category = new Category();
        $category->setTitle($title);
        $category->setNumber($number);
        
        return $category;
    }
    
    /**
     * Sanitize a string to be used as a filename
     */
    private function sanitizeFilename(string $filename): string
    {
        // Replace spaces with hyphens
        $filename = str_replace(' ', '-', $filename);
        
        // Remove any character that is not a letter, number, hyphen, or underscore
        $filename = preg_replace('/[^a-zA-Z0-9\-_]/', '', $filename);
        
        // Convert to lowercase
        $filename = strtolower($filename);
        
        return $filename;
    }
}
