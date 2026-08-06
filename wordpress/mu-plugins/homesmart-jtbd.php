<?php
/**
 * Plugin Name: HomeSmart JTBD Post Type
 * Description: Registers the jtbd_posts custom post type and exposes all
 *              matrix/condition/lead fields over the REST API. Works with or
 *              without ACF — fields registered here mirror the ACF field group.
 *
 * Install: copy into wp-content/mu-plugins/ (loads automatically).
 */

defined('ABSPATH') || exit;

add_action('init', function () {
    register_post_type('jtbd_posts', [
        'labels' => [
            'name'          => 'JTBD Innovations',
            'singular_name' => 'JTBD Innovation',
        ],
        'public'       => true,
        'show_in_rest' => true,
        'rest_base'    => 'jtbd_posts',
        'menu_icon'    => 'dashicons-hammer',
        'supports'     => ['title', 'editor', 'custom-fields', 'excerpt'],
        'has_archive'  => false,
        'rewrite'      => ['slug' => 'jtbd'],
    ]);

    $string_fields = [
        'meta_title', 'meta_description', 'post_content_markdown',
        'pre_conditions', 'post_conditions', 'tools_resources',
        'action', 'object', 'outcome',
        'matrix_interrogative', 'matrix_relational', 'matrix_scale',
        'solution_concept', 'solution_status',
        'source_url', 'source_name', 'lead_status',
    ];

    foreach ($string_fields as $field) {
        register_post_meta('jtbd_posts', $field, [
            'type'         => 'string',
            'single'       => true,
            'show_in_rest' => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
        ]);
    }
});
