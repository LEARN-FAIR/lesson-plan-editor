<?php

namespace App\Model;

class LessonPlan
{
    private ?string $name = null;
    private ?string $path = null;
    private ?string $sha = null;
    private ?string $content = null;
    private ?string $decodedContent = null;
    private ?string $htmlUrl = null;
    private ?Category $category = null;

    public function __construct(
        ?string $name = null,
        ?string $path = null,
        ?string $sha = null,
        ?string $content = null,
        ?string $decodedContent = null,
        ?string $htmlUrl = null,
        ?Category $category = null
    ) {
        $this->name = $name;
        $this->path = $path;
        $this->sha = $sha;
        $this->content = $content;
        $this->decodedContent = $decodedContent;
        $this->htmlUrl = $htmlUrl;
        $this->category = $category;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getPath(): ?string
    {
        return $this->path;
    }

    public function setPath(?string $path): self
    {
        $this->path = $path;
        return $this;
    }

    public function getSha(): ?string
    {
        return $this->sha;
    }

    public function setSha(?string $sha): self
    {
        $this->sha = $sha;
        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(?string $content): self
    {
        $this->content = $content;
        return $this;
    }

    public function getDecodedContent(): ?string
    {
        return $this->decodedContent;
    }

    public function setDecodedContent(?string $decodedContent): self
    {
        $this->decodedContent = $decodedContent;
        return $this;
    }

    public function getHtmlUrl(): ?string
    {
        return $this->htmlUrl;
    }

    public function setHtmlUrl(?string $htmlUrl): self
    {
        $this->htmlUrl = $htmlUrl;
        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): self
    {
        $this->category = $category;
        return $this;
    }

    public function toArray(): array
    {
        $data = [
            'name' => $this->name,
            'path' => $this->path,
            'sha' => $this->sha,
            'content' => $this->content,
            'decoded_content' => $this->decodedContent,
            'html_url' => $this->htmlUrl,
        ];

        if ($this->category) {
            $data['category'] = $this->category->toArray();
        }

        return $data;
    }
}
