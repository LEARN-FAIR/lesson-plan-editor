<?php

namespace App\Service;

use Symfony\Component\HttpKernel\Exception\BadRequestException;

class MarkdownService
{
    /**
     * Parse markdown content to extract front matter metadata and content
     */
    public function parseFrontMatter(string $content): array
    {
        $pattern = '/^---\s*\n(.*?)\n---\s*\n(.*?)$/s';
        
        if (preg_match($pattern, $content, $matches)) {
            $frontMatter = $this->parseFrontMatterYaml($matches[1]);
            $markdownContent = $matches[2];
            
            return [
                'frontMatter' => $frontMatter,
                'content' => $markdownContent
            ];
        }
        
        // If no front matter is found, return the content as is
        return [
            'frontMatter' => [],
            'content' => $content
        ];
    }
    
    /**
     * Parse YAML front matter to array
     */
    private function parseFrontMatterYaml(string $yaml): array
    {
        $result = [];
        $lines = explode("\n", $yaml);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            
            if (preg_match('/^(.*?):\s*(.*)$/', $line, $matches)) {
                $key = trim($matches[1]);
                $value = trim($matches[2]);
                
                // Remove quotes if present
                if (preg_match('/^[\'"](.*)[\'"]\s*$/', $value, $valueMatches)) {
                    $value = $valueMatches[1];
                }
                
                $result[$key] = $value;
            }
        }
        
        return $result;
    }
    
    /**
     * Generate markdown content with front matter
     */
    public function generateMarkdownWithFrontMatter(array $frontMatter, string $content): string
    {
        $yamlLines = [];
        
        foreach ($frontMatter as $key => $value) {
            // Add quotes for values with special characters
            if (preg_match('/[:#\[\]{},"&*!|><\'%@`]/', $value)) {
                $value = '"' . str_replace('"', '\"', $value) . '"';
            }
            
            $yamlLines[] = "$key: $value";
        }
        
        $yaml = implode("\n", $yamlLines);
        
        return "---\n$yaml\n---\n\n$content";
    }
    
    /**
     * Extract title from markdown content
     */
    public function extractTitle(string $content): ?string
    {
        // First check if title exists in front matter
        $parsed = $this->parseFrontMatter($content);
        if (!empty($parsed['frontMatter']['title'])) {
            return $parsed['frontMatter']['title'];
        }
        
        // Otherwise look for the first heading
        if (preg_match('/^#\s+(.+)$/m', $parsed['content'], $matches)) {
            return trim($matches[1]);
        }
        
        return null;
    }
    
    /**
     * Extract category information from index.md content
     */
    public function extractCategoryInfo(string $content): array
    {
        $parsed = $this->parseFrontMatter($content);
        $frontMatter = $parsed['frontMatter'];
        
        $title = $frontMatter['title'] ?? null;
        $number = $frontMatter['number'] ?? null;
        
        if (!$title && !$number) {
            // Try to extract from content if not in front matter
            if (preg_match('/^#\s+(\d+)\.\s+(.+)$/m', $parsed['content'], $matches)) {
                $number = (int) $matches[1];
                $title = trim($matches[2]);
            }
        }
        
        return [
            'title' => $title,
            'number' => $number ? (int) $number : null
        ];
    }
    
    /**
     * Convert markdown to HTML
     */
    public function markdownToHtml(string $markdown): string
    {
        // For now, we'll use a simple implementation
        // In a real application, you might want to use a library like league/commonmark
        
        // Convert headers
        $html = preg_replace('/^#\s+(.+)$/m', '<h1>$1</h1>', $markdown);
        $html = preg_replace('/^##\s+(.+)$/m', '<h2>$1</h2>', $html);
        $html = preg_replace('/^###\s+(.+)$/m', '<h3>$1</h3>', $html);
        
        // Convert paragraphs
        $html = '<p>' . preg_replace('/\n\n+/', '</p><p>', $html) . '</p>';
        
        // Convert inline code
        $html = preg_replace('/`([^`]+)`/', '<code>$1</code>', $html);
        
        // Convert code blocks
        $html = preg_replace('/```(.+?)```/s', '<pre><code>$1</code></pre>', $html);
        
        // Convert bold
        $html = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $html);
        
        // Convert italic
        $html = preg_replace('/\*([^*]+)\*/', '<em>$1</em>', $html);
        
        // Convert links
        $html = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '<a href="$2">$1</a>', $html);
        
        return $html;
    }
}
