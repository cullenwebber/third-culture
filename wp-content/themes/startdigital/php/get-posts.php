<?php

use Timber\Timber;

function get_news_posts($limit = -1)
{
    $args = array(
        'post_type' => 'post',
        'posts_per_page' => $limit
    );

    return Timber::get_posts($args);
}

function get_projects_posts($limit = -1)
{
    $args = array(
        'post_type' => 'project',
        'posts_per_page' => $limit
    );

    return Timber::get_posts($args);
}
