jQuery(document).ready(function ($) {
	// Utility function to debounce rapid-fire events
	function debounce(func, wait) {
		let timeout
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout)
				func(...args)
			}
			clearTimeout(timeout)
			timeout = setTimeout(later, wait)
		}
	}

	// Core function to save focus point data via AJAX
	const saveFocusPoint = debounce(function (
		attachmentId,
		focusX,
		focusY,
		callback
	) {
		$.ajax({
			url: focusPointData.ajaxUrl,
			type: 'POST',
			data: {
				action: 'save_focus_point',
				nonce: focusPointData.nonce,
				attachment_id: attachmentId,
				focus_x: focusX,
				focus_y: focusY,
			},
			success: function (response) {
				if (response.success) {
					if (callback) callback(null, response.data)
				} else {
					if (callback) callback(response.data)
					console.error('Failed to save focus point:', response.data)
				}
			},
			error: function (xhr, status, error) {
				if (callback) callback(error)
				console.error('AJAX error:', error)
			},
		})
	},
	500)

	// Function to initialize a single focus point container
	function initializeSingleContainer(container) {
		const selector = container.find('.focus-point-selector')
		const focusX = container.siblings('.focus-x')
		const focusY = container.siblings('.focus-y')

		// Extract attachment ID from the input name
		const nameMatch = focusX.attr('name')?.match(/attachments\[(\d+)\]/)
		if (!nameMatch) {
			console.error('Could not find attachment ID for container:', container)
			return
		}

		const attachmentId = parseInt(nameMatch[1])
		console.log('Found attachment ID:', attachmentId)

		// Track last known position
		let lastX = focusX.val()
		let lastY = focusY.val()

		function updatePosition(e) {
			e.preventDefault()

			const rect = container[0].getBoundingClientRect()
			const pageX = e.type.includes('touch') ? e.touches[0].pageX : e.pageX
			const pageY = e.type.includes('touch') ? e.touches[0].pageY : e.pageY

			const x = ((pageX - rect.left) / rect.width) * 100
			const y = ((pageY - rect.top) / rect.height) * 100

			const boundedX = Math.max(0, Math.min(100, x))
			const boundedY = Math.max(0, Math.min(100, y))

			selector.css({
				left: boundedX + '%',
				top: boundedY + '%',
			})

			focusX.val(boundedX.toFixed(1))
			focusY.val(boundedY.toFixed(1))

			if (boundedX.toFixed(1) !== lastX || boundedY.toFixed(1) !== lastY) {
				lastX = boundedX.toFixed(1)
				lastY = boundedY.toFixed(1)

				selector.addClass('saving')
				saveFocusPoint(
					attachmentId,
					boundedX,
					boundedY,
					function (error, data) {
						selector.removeClass('saving')
						if (error) {
							selector.addClass('error')
							setTimeout(() => selector.removeClass('error'), 2000)
						} else {
							selector.addClass('saved')
							setTimeout(() => selector.removeClass('saved'), 1000)
						}
					}
				)
			}
		}

		// Set up event handlers
		container.on('mousedown touchstart', function (e) {
			const moveHandler = function (e) {
				e.preventDefault()
				updatePosition(e)
			}

			updatePosition(e)
			$(document).on('mousemove touchmove', moveHandler)
			$(document).one('mouseup touchend', function () {
				$(document).off('mousemove touchmove', moveHandler)
			})
		})
	}

	// Main initialization function
	function initFocusPoint() {
		console.log('Starting focus point initialization')

		// First try direct initialization
		const $containers = $('.focus-point-container')
		console.log('Found containers:', $containers.length)

		// Handle media modal context
		const $mediaModal = $('.media-modal')
		const $attachmentDetails = $('.attachment-details')

		console.log('Media modal present:', $mediaModal.length)
		console.log('Attachment details present:', $attachmentDetails.length)

		if ($containers.length > 0) {
			$containers.each(function () {
				initializeSingleContainer($(this))
			})
		}
	}

	// Set up initialization triggers
	function setupMediaFrameListeners() {
		if (!wp.media || !wp.media.frame) {
			console.log('Media frame not available')
			return
		}

		const initWithDelay = () => setTimeout(initFocusPoint, 150)

		wp.media.frame.on('open', () => {
			console.log('Media modal opened')
			initWithDelay()
		})

		wp.media.frame.on('select', () => {
			console.log('Media selection changed')
			initWithDelay()
		})

		wp.media.frame.on('edit:attachment', () => {
			console.log('Editing attachment')
			initWithDelay()
		})

		// Additional hooks for different modal states
		if (wp.media.frame.on) {
			wp.media.frame.on('library:selection:add', initWithDelay)
			wp.media.frame.on('content:activate', initWithDelay)
			wp.media.frame.on('content:render', initWithDelay)
		}
	}

	// Initial setup
	initFocusPoint()
	setupMediaFrameListeners()

	// Backup initialization for slower loading scenarios
	$(window).on('load', initFocusPoint)

	// Handle dynamically loaded content
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.addedNodes.length) {
				const $newContainers = $(mutation.addedNodes).find(
					'.focus-point-container'
				)
				if ($newContainers.length) {
					console.log('New containers found:', $newContainers.length)
					$newContainers.each(function () {
						initializeSingleContainer($(this))
					})
				}
			}
		})
	})

	// Start observing the document for dynamically added containers
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	})
})
