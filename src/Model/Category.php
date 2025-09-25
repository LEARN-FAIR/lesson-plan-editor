<?php

namespace App\Model;

class Category
{
    private ?string $title = null;
    private ?int $number = null;

    public function __construct(?string $title = null, ?int $number = null)
    {
        $this->title = $title;
        $this->number = $number;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function getNumber(): ?int
    {
        return $this->number;
    }

    public function setNumber(?int $number): self
    {
        $this->number = $number;
        return $this;
    }

    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'number' => $this->number,
        ];
    }
}
