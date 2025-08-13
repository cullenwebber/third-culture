<?php 

/*
* ACF MODIFICATIONS
*/

// WYSIWYG HEIGHT CHANGE ------------------

function acf_wysiwyg_height() {
	?>
	<style>
		.acf-editor-wrap iframe {
			min-height: 0;
		}
	</style>
	<script>
		(function() {
			acf.addFilter('wysiwyg_tinymce_settings', function(mceInit, id, field) {
				// enable autoresizing of the WYSIWYG editor
				mceInit.wp_autoresize_on = true;
				return mceInit;
			});
			// (action called when a WYSIWYG tinymce element has been initialized)
			acf.addAction('wysiwyg_tinymce_init', function(ed, id, mceInit, field) {
				// reduce tinymce's min-height settings
				ed.settings.autoresize_min_height = 200;
				// reduce iframe's 'height' style to match tinymce settings
				var editorWrap = document.querySelector('.acf-editor-wrap');
				if (editorWrap) {
					var iframe = editorWrap.querySelector('iframe');
					if (iframe) {
						iframe.style.height = '200px';
					}
				}
			});
		})();
	</script>
	<?php
}

add_action('acf/input/admin_footer', 'acf_wysiwyg_height');

?>