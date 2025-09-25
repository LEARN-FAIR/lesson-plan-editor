<?php

namespace App\Model;

class Repository
{
    private ?string $owner = null;
    private ?string $name = null;
    private ?string $branch = null;
    private ?string $defaultBranch = null;
    private ?bool $hasWriteAccess = null;
    private ?array $branches = null;

    public function __construct(
        ?string $owner = null,
        ?string $name = null,
        ?string $branch = null,
        ?string $defaultBranch = null,
        ?bool $hasWriteAccess = null,
        ?array $branches = null
    ) {
        $this->owner = $owner;
        $this->name = $name;
        $this->branch = $branch;
        $this->defaultBranch = $defaultBranch;
        $this->hasWriteAccess = $hasWriteAccess;
        $this->branches = $branches;
    }

    public function getOwner(): ?string
    {
        return $this->owner;
    }

    public function setOwner(?string $owner): self
    {
        $this->owner = $owner;
        return $this;
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

    public function getBranch(): ?string
    {
        return $this->branch;
    }

    public function setBranch(?string $branch): self
    {
        $this->branch = $branch;
        return $this;
    }

    public function getDefaultBranch(): ?string
    {
        return $this->defaultBranch;
    }

    public function setDefaultBranch(?string $defaultBranch): self
    {
        $this->defaultBranch = $defaultBranch;
        return $this;
    }

    public function getHasWriteAccess(): ?bool
    {
        return $this->hasWriteAccess;
    }

    public function setHasWriteAccess(?bool $hasWriteAccess): self
    {
        $this->hasWriteAccess = $hasWriteAccess;
        return $this;
    }

    public function getBranches(): ?array
    {
        return $this->branches;
    }

    public function setBranches(?array $branches): self
    {
        $this->branches = $branches;
        return $this;
    }

    public function toArray(): array
    {
        return [
            'owner' => $this->owner,
            'name' => $this->name,
            'branch' => $this->branch,
            'defaultBranch' => $this->defaultBranch,
            'hasWriteAccess' => $this->hasWriteAccess,
            'branches' => $this->branches,
        ];
    }
}
