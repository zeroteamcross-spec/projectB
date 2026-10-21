<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Services;

/** Safely inserts the server-derived route prefixes into the SPA shell. */
final class PublicRouteSlugBootstrap
{
    public const HTML_PLACEHOLDER = '__PROJECTB_RESERVED_ROUTE_PREFIXES_JSON__';

    public static function injectIntoHtml(string $html, ?array $reservedPrefixes): string
    {
        $json = is_array($reservedPrefixes)
            ? json_encode(
                $reservedPrefixes,
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES
            )
            : 'null';

        return str_replace(self::HTML_PLACEHOLDER, $json === false ? 'null' : $json, $html);
    }
}
