import { getLenis } from '../../utils/smooth-scroll'

/**
 * Utility class to pin a Three.js object to the center of the viewport during scroll
 * Uses Lenis scroll events to smoothly transition the object through three phases:
 * 1. Entrance: Object moves from startYOffset to centerY as container enters viewport
 * 2. Pinned: Object stays at centerY while container is in viewport
 * 3. Exit: Object moves from centerY to endYOffset as container exits viewport
 */
class ScrollPinnedObject {
	constructor(object, options = {}) {
		this.object = object
		this.container = options.container // DOM container element
		this.camera = options.camera // Three.js camera
		this.lenis = options.lenis || getLenis()

		// Y position offsets
		this.startYOffset = options.startYOffset ?? null // Position when entering (null = auto calculate)
		this.centerY = options.centerY ?? 0 // Position when centered
		this.endYOffset = options.endYOffset ?? null // Position when exiting (null = auto calculate)

		// Auto-calculate offsets if not provided
		if (this.startYOffset === null || this.endYOffset === null) {
			const { height } = this.getFrustumDimensions()
			if (this.startYOffset === null) this.startYOffset = height
			if (this.endYOffset === null) this.endYOffset = -height
		}

		this.enabled = true
		this.setupLenisListener()
	}

	setupLenisListener() {
		this.lenis.on('scroll', this.updatePosition.bind(this))
	}

	updatePosition() {
		if (!this.enabled || !this.object || !this.container) return

		const rect = this.container.getBoundingClientRect()
		const viewportHeight = window.innerHeight

		// Calculate container position relative to viewport
		const containerTop = rect.top
		const containerBottom = rect.bottom

		let yPos

		// Phase 1: Entrance (container top: viewport bottom -> viewport top)
		if (containerTop > 0) {
			// Progress from 0 (at viewport bottom) to 1 (at viewport top)
			const progress = 1 - Math.min(1, containerTop / viewportHeight)
			yPos = this.startYOffset + (this.centerY - this.startYOffset) * progress
		}
		// Phase 2: Pinned (container spans viewport)
		else if (containerBottom > viewportHeight) {
			yPos = this.centerY
		}
		// Phase 3: Exit (container bottom: viewport bottom -> viewport top)
		else if (containerBottom > 0) {
			// Progress from 0 (at viewport bottom) to 1 (at viewport top)
			const progress = 1 - containerBottom / viewportHeight
			yPos = this.centerY + (this.endYOffset - this.centerY) * progress
		}
		// Fully exited
		else {
			yPos = this.endYOffset
		}

		this.object.position.y = yPos
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}

	/**
	 * Update the pin offsets dynamically
	 */
	updateOffsets(startY, centerY, endY) {
		if (startY !== undefined) this.startYOffset = startY
		if (centerY !== undefined) this.centerY = centerY
		if (endY !== undefined) this.endYOffset = endY
		this.updatePosition()
	}

	/**
	 * Enable/disable position updates
	 */
	enable() {
		this.enabled = true
		this.updatePosition()
	}

	disable() {
		this.enabled = false
	}

	/**
	 * Clean up
	 */
	destroy() {
		this.enabled = false
		// Note: We don't remove the Lenis listener as it's shared
		// If you need to remove it, you'd need to store the bound function
	}
}

export default ScrollPinnedObject
