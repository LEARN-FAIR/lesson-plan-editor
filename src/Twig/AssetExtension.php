<?php

namespace App\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

class AssetExtension extends AbstractExtension
{
    public function __construct(
        private string $appVersion
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('versioned_asset', [$this, 'versionedAsset']),
        ];
    }

    public function versionedAsset(string $path): string
    {
        $separator = str_contains($path, '?') ? '&' : '?';
        return $path . $separator . 'v=' . $this->appVersion;
    }
}
