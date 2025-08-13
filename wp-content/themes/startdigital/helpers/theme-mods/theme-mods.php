<?php

/**
 * Remove author from oEmbeds
 */
function disableEmbedsFilter($data)
{
    unset($data['author_url']);
    unset($data['author_name']);
    return $data;
}
add_filter('oembed_response_data', 'disableEmbedsFilter');

/**
 * Enable features from Soil when plugin is activated
 * @link https://roots.io/plugins/soil/
 */
add_theme_support('soil', [
    'clean-up',
    'disable-asset-versioning',
    'disable-trackbacks',
    'js-to-footer',
    'nav-walker',
    'nice-search',
    'relative-urls'
]);

/**
 * Remove items from admin bar
 */
function removeItemsFromAdminBar(WP_Admin_Bar $menu)
{
    $menu->remove_node('comments'); // Comments
    $menu->remove_node('customize'); // Customize
    $menu->remove_node('dashboard'); // Dashboard
    $menu->remove_node('edit'); // Edit
    $menu->remove_node('menus'); // Menus
    $menu->remove_node('new-content'); // New Content
    $menu->remove_node('search'); // Search
    $menu->remove_node('themes'); // Themes
    $menu->remove_node('updates'); // Updates
    $menu->remove_node('view'); // View
    $menu->remove_node('widgets'); // Widgets
    $menu->remove_node('wp-logo'); // WordPress Logo
}
add_action('admin_bar_menu', 'removeItemsFromAdminBar', 999);

/**
 * Remove items from dashboard
 */
function removeItemsFromDashboard()
{
    remove_meta_box('dashboard_activity', 'dashboard', 'normal'); // Activity
    remove_meta_box('dashboard_site_health', 'dashboard', 'normal'); // Site Health Status
    remove_meta_box('dashboard_primary', 'dashboard', 'side'); // WordPress Events and News
    remove_meta_box('dashboard_quick_press', 'dashboard', 'side'); // Quick Draft
}
add_action('wp_dashboard_setup', 'removeItemsFromDashboard');

/**
 * Use the Favicon as the login screen logo
 */
function faviconAsLoginLogo()
{
    $favicon = get_site_icon_url();

    echo "
        <style type='text/css'>
            body.login div#login h1 a {
                background-image: url('$favicon');
                pointer-events: none;
            }
        </style>
    ";
}
add_action('login_enqueue_scripts', 'faviconAsLoginLogo');

/**
 * Add GTM to the header
 */
function addGtmToHead()
{
    if(!function_exists('get_field')){
        return;
    }

    $id = get_field('google_tag_manager_id');

    if (!$id) {
        return;
    }

    return <<<EOD
        <!-- Google Tag Manager -->
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer', $id);</script>
        <!-- End Google Tag Manager -->
        EOD;
}
add_action('wp_head', 'addGtmToHead');

/**
 * Add Google Analytics to the header
 */
function addGoogleAnalyticsToHead()
{
    if(!function_exists('get_field')){
       return;
    }

    $id = get_field('google_analytics_id');

    if (!$id) {
        return;
    }

    return <<<EOD
        <script async src="https://www.googletagmanager.com/gtag/js?id=$id"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', $id);
        </script>
    EOD;
}
add_action('wp_head', 'addGoogleAnalyticsToHead');

/**
 * Change default email recipient on Gravity Forms
 */
function custom_conditional_notification_email($notification, $form, $entry) {
    if ($notification['to'] === '{admin_email}') {
        if(get_field('default_forms_recipient_email', 'options')){
            $notification['to'] = get_field('default_forms_recipient_email', 'options');
        }
    }

    return $notification;
}
add_filter('gform_notification', 'custom_conditional_notification_email', 10, 3);

/**
 * Add rewrite rule for single posts
 */
function add_posts_prefix_to_blog_posts() {
    add_rewrite_rule(
        '^posts/([^/]+)/?$',
        'index.php?name=$matches[1]',
        'top'
    );
}
add_action('init', 'add_posts_prefix_to_blog_posts');


/**
 * // Only modify permalinks for 'post' post type
 */
function filter_post_permalink($permalink, $post) {
    if ($post->post_type === 'post') {
        return home_url('/posts/' . $post->post_name);
    }
    return $permalink;
}
add_filter('post_link', 'filter_post_permalink', 10, 2);
