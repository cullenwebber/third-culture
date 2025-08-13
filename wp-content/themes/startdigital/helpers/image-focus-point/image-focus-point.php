<?php

class ImageFocusPoint
{
    public function __construct()
    {
        add_filter('attachment_fields_to_edit', [$this, 'add_focus_point_field'], 10, 2);
        add_filter('attachment_fields_to_save', [$this, 'save_focus_point'], 10, 2);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_scripts']);
        add_action('wp_ajax_save_focus_point', [$this, 'ajax_save_focus_point']);

        add_filter('timber/twig/filters', function ($filters) {
            $filters['focus'] = [
                'callable' => function ($image) {
                    // Get image ID from various input types
                    $id = null;
                    if (is_numeric($image)) {
                        $id = $image;
                    } elseif (is_string($image)) {
                        $id = function_exists('get_attachment_id')
                            ? get_attachment_id($image)
                            : attachment_url_to_postid($image);
                    } elseif (is_array($image) && isset($image['ID'])) {
                        $id = $image['ID'];
                    }

                    if (!$id) return '';

                    // Get focus point
                    $focus_x = get_post_meta($id, '_focus_x', true) ?: '50';
                    $focus_y = get_post_meta($id, '_focus_y', true) ?: '50';

                    return sprintf('object-position: %s%% %s%%;', $focus_x, $focus_y);
                }
            ];
            return $filters;
        });
    }

    public function add_focus_point_field($form_fields, $post)
    {
        // Only add fields to image attachments
        if (strpos($post->post_mime_type, 'image/') !== 0) {
            return $form_fields;
        }

        $focus_x = get_post_meta($post->ID, '_focus_x', true) ?: '50';
        $focus_y = get_post_meta($post->ID, '_focus_y', true) ?: '50';

        $form_fields['focus_point'] = [
            'label' => 'Focus Point',
            'input' => 'html',
            'html' => sprintf(
                '<div class="focus-point-container" style="position:relative;max-width:300px;margin-top:10px;">
                    <img src="%s" style="width:100%%;height:auto;" class="focus-point-image" />
                    <div class="focus-point-selector" style="position:absolute;transform:translate(-50%%, -50%%);left:%s%%;top:%s%%;cursor:move;width:20px;height:20px;border-radius:50%%;">
                    </div>
                </div>
                <input type="hidden" name="attachments[%d][focus_x]" value="%s" class="focus-x" />
                <input type="hidden" name="attachments[%d][focus_y]" value="%s" class="focus-y" />',
                wp_get_attachment_image_url($post->ID, 'medium'),
                esc_attr($focus_x),
                esc_attr($focus_y),
                $post->ID,
                esc_attr($focus_x),
                $post->ID,
                esc_attr($focus_y)
            )
        ];

        return $form_fields;
    }

    public function save_focus_point($post, $attachment)
    {
        if (isset($attachment['focus_x'])) {
            update_post_meta($post['ID'], '_focus_x', floatval($attachment['focus_x']));
        }

        if (isset($attachment['focus_y'])) {
            update_post_meta($post['ID'], '_focus_y', floatval($attachment['focus_y']));
        }

        return $post;
    }

    public function enqueue_admin_scripts($hook)
    {
        if ($hook !== 'post.php' && $hook !== 'upload.php') {
            return;
        }

        wp_enqueue_style(
            'focus-point-admin',
            get_stylesheet_directory_uri() . '/helpers/image-focus-point/css/focus-point-admin.css',
            [],
            '1.0'
        );

        wp_enqueue_script(
            'focus-point-admin',
            get_stylesheet_directory_uri() . '/helpers/image-focus-point/js/focus-point-admin.js',
            ['jquery'],
            '1.0',
            true
        );

        // Add nonce and AJAX URL for security
        wp_localize_script('focus-point-admin', 'focusPointData', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('focus_point_nonce')
        ]);
    }

    public function ajax_save_focus_point()
    {
        if (!check_ajax_referer('focus_point_nonce', 'nonce', false)) {
            wp_send_json_error('Invalid nonce');
        }

        if (!current_user_can('upload_files')) {
            wp_send_json_error('Insufficient permissions');
        }

        $attachment_id = intval($_POST['attachment_id']);
        $focus_x = floatval($_POST['focus_x']);
        $focus_y = floatval($_POST['focus_y']);

        // Validate input ranges
        if ($focus_x < 0 || $focus_x > 100 || $focus_y < 0 || $focus_y > 100) {
            wp_send_json_error('Invalid focus point values');
        }

        $updated_x = update_post_meta($attachment_id, '_focus_x', $focus_x);
        $updated_y = update_post_meta($attachment_id, '_focus_y', $focus_y);

        if ($updated_x && $updated_y) {
            wp_send_json_success([
                'message' => 'Focus point updated successfully',
                'focus_x' => $focus_x,
                'focus_y' => $focus_y
            ]);
        } else {
            wp_send_json_error('Failed to update focus point');
        }
    }
}

new ImageFocusPoint();
