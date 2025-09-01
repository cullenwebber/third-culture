<?php

use Timber\Site;
use Timber\Timber;

/**
 * Timber starter-theme
 * https://github.com/timber/starter-theme
 *
 * @package  WordPress
 * @subpackage  Timber
 * @since   Timber 0.1
 */

/**
 * If you are installing Timber as a Composer dependency in your theme, you'll need this block
 * to load your dependencies and initialize Timber. If you are using Timber via the WordPress.org
 * plug-in, you can safely delete this block.
 */
$composer_autoload = __DIR__ . '/vendor/autoload.php';
if (file_exists($composer_autoload)) {
	require_once $composer_autoload;
	Timber::init();
}

include 'php/tiny-mce-extend.php';
include 'php/get-posts.php';


/**
 * Include helpers
 */
$helpers = glob(__DIR__ . '/helpers/*/*.php');
foreach ($helpers as $helper) {
	if (file_exists($helper)) {
		include_once $helper;
	}
}

/**
 * Setup our custom options page
 */
if (function_exists('acf_add_options_page')) {
	acf_add_options_page(array(
		'page_title' 	=> 'Site Settings',
		'menu_title'	=> 'Site Settings',
		'menu_slug' 	=> 'site-settings',
		'capability'	=> 'edit_posts',
		'redirect'		=> false
	));
}

/**
 * This ensures that Timber is loaded and available as a PHP class.
 * If not, it gives an error message to help direct developers on where to activate
 */
if (!class_exists('Timber')) {

	add_action(
		'admin_notices',
		function () {
			echo '<div class="error"><p>Timber not activated. Make sure you activate the plugin in <a href="' . esc_url(admin_url('plugins.php#timber')) . '">' . esc_url(admin_url('plugins.php')) . '</a></p></div>';
		}
	);

	add_filter(
		'template_include',
		function ($template) {
			return get_stylesheet_directory() . '/static/no-timber.html';
		}
	);
	return;
}

/**
 * Sets the directories (inside your theme) to find .twig files
 */
Timber::$dirname = array('templates', 'views');

/**
 * We're going to configure our theme inside of a subclass of Timber\Site
 * You can move this to its own file and include here via php's include("MySite.php")
 */
class StartDigital extends Site
{
	/** Add timber support. */
	public function __construct()
	{
		add_action('after_setup_theme', array($this, 'theme_supports'));
		add_filter('timber/context', array($this, 'add_to_context'));
		add_action('init', array($this, 'register_post_types'));
		add_action('init', array($this, 'register_taxonomies'));
		add_action('wp_enqueue_scripts', array($this, 'register_assets'));
		parent::__construct();
	}
	/** This is where you can register custom post types. */
	public function register_post_types() {}
	/** This is where you can register custom taxonomies. */
	public function register_taxonomies() {}

	/** This is where you can register custom CSS & JS files. */
	public function register_assets()
	{
		$style_version = filemtime(get_stylesheet_directory() . '/static/style.css') ?: '';
		$script_version = filemtime(get_stylesheet_directory() . '/static/site.js') ?: '';

		wp_enqueue_style('startdigital', get_stylesheet_directory_uri() . '/static/style.css', false, $style_version);
		wp_enqueue_script('startdigital', get_stylesheet_directory_uri() . '/static/site.js', false, $script_version);

		// wp_enqueue_style('adobe-fonts', 'https://use.typekit.net/PASTE_PROJECT_ID_HERE.css');
	}

	/** This is where you add some context
	 *
	 * @param string $context context['this'] Being the Twig's {{ this }}.
	 */
	public function add_to_context($context)
	{
		if (function_exists('get_fields')) {
			$context['options'] = get_fields('options');
		}
		$context['menu']  = Timber::get_menu();
		$context['site']  = $this;

		return $context;
	}

	public function theme_supports()
	{
		/*
		 * Let WordPress manage the document title.
		 * By adding theme support, we declare that this theme does not use a
		 * hard-coded <title> tag in the document head, and expect WordPress to
		 * provide it for us.
		 */
		add_theme_support('title-tag');

		/*
		 * Enable support for Post Thumbnails on posts and pages.
		 *
		 * @link https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/
		 */
		add_theme_support('post-thumbnails');

		add_theme_support('menus');
		/**
		 * Register our first menu
		 */
		register_nav_menus(
			array(
				'primary' => __('Primary Menu', 'startdigital'),
			)
		);

		add_theme_support('editor-styles');
		add_editor_style('static/editor.css');
	}
}

new StartDigital();

add_filter('timber/meta/transform_value', '__return_true');
