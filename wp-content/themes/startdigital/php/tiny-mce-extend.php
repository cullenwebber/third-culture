<?php

/**
 * Adds the custom TinyMCE field to the WordPress WYSIWYG editor
 */
function sd_add_custom_dropdown_to_mce($buttons)
{
    array_unshift($buttons, 'styleselect');
    return $buttons;
}
add_filter('mce_buttons_2', 'sd_add_custom_dropdown_to_mce');

/**
 * When a user selects one of the custom styles from the dropdown menu,
 * the corresponding class (e.g. is-h1, is-h2, etc.) is applied to the selected heading.
 */
function sd_allow_custom_classes_to_be_applied_to_headings($init_array)
{
    $titles = ['Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6', 'Heading 7', 'Supertitle'];
    $headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'supertitle'];
    $style_formats = array();

    foreach ($headings as $index => $heading) {
        $style_formats[] = array(
            'title' => "$titles[$index]",
            'selector' => 'h1,h2,h3,h4,h5,h6,span,p,.supertitle',
            'attributes' => array('class' => "is-$heading")
        );
    }

    // Also add one for buttons
    $style_formats[] = array(
        'title' => "Button",
        'selector' => 'a',
        'attributes' => array('class' => 'is-button')
    );

    // Insert the array, JSON ENCODED, into 'style_formats'
    $init_array['style_formats'] = json_encode($style_formats);

    return $init_array;
}
add_filter('tiny_mce_before_init', 'sd_allow_custom_classes_to_be_applied_to_headings');
