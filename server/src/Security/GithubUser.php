<?php

namespace App\Security;

use Symfony\Component\Security\Core\User\UserInterface;

class GithubUser implements UserInterface
{
    private string $identifier;
    private array $roles = [];
    private ?string $username = null;
    private ?string $email = null;
    private ?string $avatarUrl = null;

    public function __construct(string $identifier, ?string $username = null, ?string $email = null, ?string $avatarUrl = null)
    {
        $this->identifier = $identifier;
        $this->username = $username;
        $this->email = $email;
        $this->avatarUrl = $avatarUrl;
        $this->roles = ['ROLE_USER'];
    }

    public function getUserIdentifier(): string
    {
        return $this->identifier;
    }

    public function getRoles(): array
    {
        return $this->roles;
    }

    public function eraseCredentials(): void
    {
        // Nothing to erase as we don't store sensitive information
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(?string $username): self
    {
        $this->username = $username;
        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): self
    {
        $this->avatarUrl = $avatarUrl;
        return $this;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->identifier,
            'username' => $this->username,
            'email' => $this->email,
            'avatar_url' => $this->avatarUrl,
        ];
    }
}
