<?php

namespace App\Security;

use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

class GithubUserProvider implements UserProviderInterface
{
    /**
     * @param string $identifier The GitHub username or ID
     * @return UserInterface
     */
    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        // Create a GithubUser object based on the identifier (username or ID)
        return new GithubUser($identifier);
    }

    /**
     * @param UserInterface $user
     * @return UserInterface
     */
    public function refreshUser(UserInterface $user): UserInterface
    {
        if (!$user instanceof GithubUser) {
            throw new UnsupportedUserException(sprintf('Invalid user class "%s".', get_class($user)));
        }

        // Return a fresh user object with the same identifier
        return $this->loadUserByIdentifier($user->getUserIdentifier());
    }

    /**
     * @param string $class
     * @return bool
     */
    public function supportsClass(string $class): bool
    {
        return GithubUser::class === $class || is_subclass_of($class, GithubUser::class);
    }
}
