<?php

/**
 * The template for displaying Author Archive pages
 *
 * Methods for TimberHelper can be found in the /lib sub-directory
 *
 * @package  WordPress
 * @subpackage  Timber
 * @since    Timber 0.1
 */

global $wp_query;

use Timber\Timber;

$context = Timber::context();
$context['posts'] = Timber::get_posts();

if (isset($wp_query->query_vars['author'])) {
	$context['author'] = Timber::get_user($wp_query->query_vars['author']);
}

Timber::render(['author.twig'], $context);
