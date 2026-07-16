<?php

namespace App\GitHub\Infrastructure\ApiPlatform\Resource;

final class CreateBranchInput
{
    public ?string $branchName = null;

    public ?string $sourceBranch = null;
}
