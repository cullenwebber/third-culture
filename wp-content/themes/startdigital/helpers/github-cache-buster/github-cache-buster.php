<?php

/**
 * This is a simple cache purging endpoint that supports XXX.
 * On deploy, it will clear the cache of the site so that the new changes are reflected immediately.
 *
 * To use this, you need to define a PURGE_TOKEN in your .env and also put it in your GitHub action secrets
 */

interface CachePurgerInterface
{
    public function isActive(): bool;
    public function purge(): bool;
    public function getName(): string;
}

class LiteSpeedPurger implements CachePurgerInterface
{
    public function isActive(): bool
    {
        return is_plugin_active('litespeed-cache/litespeed-cache.php');
    }

    public function purge(): bool
    {
        if (function_exists('do_action')) {
            do_action('litespeed_purge_all');
            return true;
        }
        return false;
    }

    public function getName(): string
    {
        return 'LiteSpeed Cache';
    }
}

class W3TotalCachePurger implements CachePurgerInterface
{
    public function isActive(): bool
    {
        return is_plugin_active('w3-total-cache/w3-total-cache.php');
    }

    public function purge(): bool
    {
        if (function_exists('w3tc_flush_all')) {
            w3tc_flush_all();
            return true;
        }
        return false;
    }

    public function getName(): string
    {
        return 'W3 Total Cache';
    }
}

class WPSuperCachePurger implements CachePurgerInterface
{
    public function isActive(): bool
    {
        return is_plugin_active('wp-super-cache/wp-cache.php');
    }

    public function purge(): bool
    {
        if (function_exists('wp_cache_clean_cache')) {
            global $file_prefix;
            wp_cache_clean_cache($file_prefix, true);
            return true;
        }
        return false;
    }

    public function getName(): string
    {
        return 'WP Super Cache';
    }
}

class CachePurgeManager
{
    private array $purgers = [];
    private static ?CachePurgeManager $instance = null;

    private function __construct()
    {
        $this->registerPurgers();
    }

    public static function getInstance(): CachePurgeManager
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function registerPurgers(): void
    {
        $this->purgers = [
            new LiteSpeedPurger(),
            new W3TotalCachePurger(),
            new WPSuperCachePurger(),
        ];
    }

    public function purgeAllActive(): array
    {
        $results = [];
        $purgedAny = false;

        foreach ($this->purgers as $purger) {
            if ($purger->isActive()) {
                $success = $purger->purge();
                $results[] = [
                    'plugin' => $purger->getName(),
                    'success' => $success
                ];
                if ($success) {
                    $purgedAny = true;
                }
            }
        }

        return [
            'overall_success' => $purgedAny,
            'details' => $results
        ];
    }
}

// Register the REST API endpoint
add_action('rest_api_init', function () {
    register_rest_route('cache-purge/v1', '/purge', [
        'methods' => 'POST',
        'callback' => 'purgeCache',
        'permission_callback' => function () {
            return verifyPurgeToken();
        }
    ]);
});

function verifyPurgeToken(): bool
{
    $token = $_SERVER['HTTP_X_PURGE_TOKEN'] ?? '';
    $validToken = defined('PURGE_TOKEN') ? PURGE_TOKEN : '';
    return hash_equals($validToken, $token);
}

function purgeCache(): WP_REST_Response
{
    if (!function_exists('is_plugin_active')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }

    $results = CachePurgeManager::getInstance()->purgeAllActive();

    if ($results['overall_success']) {
        return new WP_REST_Response([
            'status' => 'success',
            'message' => 'Cache purged successfully',
            'details' => $results['details']
        ], 200);
    }

    return new WP_REST_Response([
        'status' => 'error',
        'message' => 'No active cache plugins were successfully purged',
        'details' => $results['details']
    ], 500);
}
