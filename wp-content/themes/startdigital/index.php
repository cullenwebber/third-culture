<?php

use Timber\Timber;

$context = Timber::context();
$context['post'] = Timber::get_post();
$context['posts'] = Timber::get_posts();
$context['categories'] = array_filter(Timber::get_terms('category'), fn($category) => $category->name !== 'Uncategorized');
$context['title'] = $context['post']->title;

Timber::render('index.twig', $context);
