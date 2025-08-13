<?php

use Timber\Timber;
use Timber\PostCollectionInterface;

/**
 * Get related posts by post type.
 *
 * @param int $current_post_id
 * @param string|array $post_type
 * @param int $post_per_page
 * @param ?array $args Optional arguments
 *
 * @return Array $posts Recent posts
 */
function get_related_posts(int $current_post_id, string|array $post_type = 'post', int $posts_per_page = 3, ?array $args = []): PostCollectionInterface|null
{
    if (!isset($current_post_id)) {
        throw new Error('Post ID is required.');
    }

    $arguments = [
        'post_type' => $post_type,
        'post_status' => 'publish',
        'posts_per_page' => $posts_per_page,
        'post__not_in' => [$current_post_id],
    ];

    // Add new args if specified
    if (!empty($args)) {
        foreach ($args as $key => $value) {
            $arguments[$key] = $value;
        }
    }

    return Timber::get_posts($arguments);
}
