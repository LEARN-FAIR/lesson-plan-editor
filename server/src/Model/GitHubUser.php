<?php

namespace App\Model;

class GitHubUser
{
    private ?int $id = null;
    private ?string $login = null;
    private ?string $name = null;
    private ?string $email = null;
    private ?string $avatarUrl = null;
    private ?string $htmlUrl = null;
    private ?string $accessToken = null;

    public function __construct(
        ?int $id = null,
        ?string $login = null,
        ?string $name = null,
        ?string $email = null,
        ?string $avatarUrl = null,
        ?string $htmlUrl = null,
        ?string $accessToken = null
    ) {
        $this->id = $id;
        $this->login = $login;
        $this->name = $name;
        $this->email = $email;
        $this->avatarUrl = $avatarUrl;
        $this->htmlUrl = $htmlUrl;
        $this->accessToken = $accessToken;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(?int $id): self
    {
        $this->id = $id;
        return $this;
    }

    public function getLogin(): ?string
    {
        return $this->login;
    }

    public function setLogin(?string $login): self
    {
        $this->login = $login;
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

    public function getHtmlUrl(): ?string
    {
        return $this->htmlUrl;
    }

    public function setHtmlUrl(?string $htmlUrl): self
    {
        $this->htmlUrl = $htmlUrl;
        return $this;
    }

    public function getAccessToken(): ?string
    {
        return $this->accessToken;
    }

    public function setAccessToken(?string $accessToken): self
    {
        $this->accessToken = $accessToken;
        return $this;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'login' => $this->login,
            'name' => $this->name,
            'email' => $this->email,
            'avatar_url' => $this->avatarUrl,
            'html_url' => $this->htmlUrl,
        ];
    }
}
