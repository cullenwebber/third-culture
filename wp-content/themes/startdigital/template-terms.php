<?php

/**
 * Template Name: Terms Template
 *
 */

use Timber\Timber;

$context = Timber::context();
$post = Timber::get_post();
$context['post'] = $post;

Timber::render('template-terms.twig', $context);
