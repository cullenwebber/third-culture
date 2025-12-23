import * as THREE from 'three'
import { Text } from 'three-text/three'
import { getLenis } from '../../utils/smooth-scroll'

// Set HarfBuzz path once
Text.setHarfBuzzPath('/wp-content/themes/startdigital/static/hb/hb.wasm')

class WebGLText {
	constructor(scene, camera, element, container = null, config = {}) {
		this.scene = scene
		this.camera = camera
		this.element = element
		this.lenis = getLenis()
		this.container = container

		// Configuration options
		this.config = {
			hideOriginal: config.hideOriginal !== false,
			fontPath:
				config.fontPath ||
				'/wp-content/themes/startdigital/static/fonts/montreal-medium.ttf',
			material: config.material,
			zPosition: config.zPosition || 0,
			...config,
		}

		this.enabled = true
		this.computedStyle = window.getComputedStyle(this.element)
		this.isReady = false

		// Create group to hold text mesh
		this.mesh = new THREE.Group()
		this.scene.add(this.mesh)

		// Create mesh asynchronously
		this.createMesh().then(() => {
			this.isReady = true
			this.setupListeners()
			this.updateText()

			if (this.config.hideOriginal) {
				this.element.style.opacity = 0
			}
		})
	}

	async createMesh() {
		// Create initial text geometry
		await this.updateTextGeometry()
	}

	async updateTextGeometry() {
		// Clear existing text meshes
		while (this.mesh.children.length > 0) {
			const child = this.mesh.children[0]
			if (child.geometry) child.geometry.dispose()
			if (child.material && !this.config.material) child.material.dispose()
			this.mesh.remove(child)
		}

		const text = this.element.innerText
		if (!text || text.trim().length === 0) return

		// Get font size and element width in pixels
		const fontSize = parseFloat(this.computedStyle.fontSize)
		const rect = this.element.getBoundingClientRect()

		// Calculate layout width - since we're using fontSize as the size,
		// the layout width should be in the same pixel units
		const layoutWidth = rect.width

		// Get text alignment
		const textAlign = this.computedStyle.textAlign || 'left'

		// Get line height from computed styles
		const lineHeightValue = this.computedStyle.lineHeight
		let lineHeight = 1.0 // default
		if (lineHeightValue && lineHeightValue !== 'normal') {
			// lineHeight could be in pixels or unitless
			if (lineHeightValue.endsWith('px')) {
				lineHeight = parseFloat(lineHeightValue) / fontSize
			} else {
				lineHeight = parseFloat(lineHeightValue)
			}
		}

		// Get letter spacing from computed styles (in em units for three-text)
		const letterSpacingValue = this.computedStyle.letterSpacing
		let letterSpacing = 0
		if (letterSpacingValue && letterSpacingValue !== 'normal') {
			// Convert pixel value to em
			letterSpacing = parseFloat(letterSpacingValue) / fontSize
		}

		// Create text using three-text
		try {
			const result = await Text.create({
				text: text,
				font: this.config.fontPath,
				size: fontSize,
				depth: 0.01,
				lineHeight: lineHeight * 0.83,
				letterSpacing: letterSpacing,
				layout: {
					width: layoutWidth,
					align: textAlign,
				},
			})

			// Create or use provided material
			const material = this.config.material || this.createMaterial()

			// Create mesh
			const textMesh = new THREE.Mesh(result.geometry, material)

			// Scale geometry to match DOM font size in world space
			const worldSize = this.getWorldSizeFromPixels({ height: fontSize })
			// Scale to match desired world size
			const scaleFactor = worldSize.height / fontSize

			result.geometry.scale(scaleFactor, scaleFactor, scaleFactor)

			// Compute bounding box after scaling
			result.geometry.computeBoundingBox()
			const bbox = result.geometry.boundingBox
			this.textWidth = bbox.max.x - bbox.min.x
			this.textHeight = bbox.max.y - bbox.min.y

			// Center the text within the mesh group
			const horizontalCenter = (bbox.max.x + bbox.min.x) / 2
			const verticalCenter = (bbox.max.y + bbox.min.y) / 2
			textMesh.position.set(-horizontalCenter, -verticalCenter, 0)

			this.mesh.add(textMesh)
		} catch (error) {
			console.error('Error creating text:', error)
		}
	}

	createMaterial() {
		const color = new THREE.Color(this.computedStyle.color)

		// Default material - can be customized or use shaders
		if (this.config.vertexShader && this.config.fragmentShader) {
			return new THREE.ShaderMaterial({
				vertexShader: this.config.vertexShader,
				fragmentShader: this.config.fragmentShader,
				uniforms: {
					uProgress: new THREE.Uniform(1),
					uColor: new THREE.Uniform(color),
					...this.config.uniforms,
				},
			})
		} else {
			// Simple material
			return new THREE.MeshBasicMaterial({
				color: color,
				transparent: false,
			})
		}
	}

	async updateText() {
		if (!this.enabled || !this.element || !this.isReady) {
			this.mesh.visible = false
			return
		}

		this.mesh.visible = true

		// Update text content if changed
		const currentText = this.element.innerText
		const existingMesh = this.mesh.children[0]
		if (!existingMesh || this.lastText !== currentText) {
			this.lastText = currentText
			await this.updateTextGeometry()
		}

		// Get element and container rectangles
		const rect = this.element.getBoundingClientRect()
		const containerRect = this.getContainerRect()

		// Calculate position relative to container
		let relativeLeft = rect.left - containerRect.left
		let relativeTop = rect.top - containerRect.top

		// For centered text, position at element center instead of left edge
		const textAlign = this.computedStyle.textAlign || 'left'
		if (textAlign === 'center') {
			relativeLeft += rect.width / 2
		} else if (textAlign === 'right') {
			relativeLeft += rect.width
		}

		// Add half the element height to position at vertical center of the element
		relativeTop += rect.height / 2

		// Convert to NDC coordinates
		const ndcX = (relativeLeft / containerRect.width) * 2 - 1
		const ndcY = -((relativeTop / containerRect.height) * 2 - 1)

		// Convert to world coordinates using the configured z position
		const { width, height } = this.getFrustumDimensions(this.config.zPosition)
		const worldX = ndcX * (width / 2)
		const worldY = ndcY * (height / 2)

		// Set position
		this.mesh.position.set(worldX, worldY, this.config.zPosition)
	}

	setupListeners() {
		// Update on scroll
		this.scrollHandler = () => {
			this.updateText()
		}
		this.lenis.on('scroll', this.scrollHandler)

		// Update on resize
		this.resizeHandler = () => {
			this.computedStyle = window.getComputedStyle(this.element)
			this.updateText()
		}
		window.addEventListener('resize', this.resizeHandler)
	}

	enable() {
		this.enabled = true
		this.updateText()
	}

	disable() {
		this.enabled = false
		this.mesh.visible = false
	}

	setElement(element) {
		// Restore visibility of old element if needed
		if (this.config.hideOriginal && this.element) {
			this.element.style.visibility = ''
		}

		// Set new element
		this.element = element
		this.computedStyle = window.getComputedStyle(element)

		// Hide new element if needed
		if (this.config.hideOriginal) {
			this.element.style.visibility = 'hidden'
		}

		// Update text and styles
		this.lastText = null
		this.updateText()
	}

	setMaterial(material) {
		if (this.mesh.children[0]) {
			this.mesh.children[0].material = material
		}
		this.config.material = material
	}

	getMaterial() {
		return this.mesh.children[0]?.material
	}

	// Method to update z position after instantiation
	setZPosition(zPosition) {
		this.config.zPosition = zPosition
		this.updateText() // Recalculate position with new z value
	}

	getZPosition() {
		return this.config.zPosition
	}

	// Animation methods
	show(duration = 1.8, ease = [0.25, 1, 0.5, 1]) {
		const material = this.getMaterial()
		if (!material) return

		if (material.uniforms && material.uniforms.uProgress) {
			material.uniforms.uProgress.value = 1
		} else {
			material.opacity = 1
		}
		this.mesh.visible = true
	}

	hide(duration = 1.8) {
		const material = this.getMaterial()
		if (!material) return

		if (material.uniforms && material.uniforms.uProgress) {
			material.uniforms.uProgress.value = 0
		} else {
			material.opacity = 0
		}
		// Optionally hide after animation
		setTimeout(() => {
			this.mesh.visible = false
		}, duration * 1000)
	}

	// Helper methods
	getFrustumDimensions(zPosition = 0) {
		const distance = Math.abs(this.camera.position.z - zPosition)
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}

	getWorldSizeFromPixels(options) {
		const containerRect = this.getContainerRect()
		const { width: frustumWidth, height: frustumHeight } =
			this.getFrustumDimensions(this.config.zPosition)
		const result = {}

		if (options.width !== undefined) {
			const worldUnitsPerPixel = frustumWidth / containerRect.width
			result.width = options.width * worldUnitsPerPixel
		}

		if (options.height !== undefined) {
			const worldUnitsPerPixel = frustumHeight / containerRect.height
			result.height = options.height * worldUnitsPerPixel
		}

		return result
	}

	getContainerRect() {
		if (this.container) {
			return this.container.getBoundingClientRect()
		}
		if (this.scene.userData && this.scene.userData.container) {
			return this.scene.userData.container.getBoundingClientRect()
		}

		return {
			left: 0,
			top: 0,
			width: window.innerWidth,
			height: window.innerHeight,
		}
	}

	dispose() {
		// Remove from scene
		this.scene.remove(this.mesh)

		// Dispose of meshes and materials
		this.mesh.children.forEach((child) => {
			if (child.geometry) child.geometry.dispose()
			if (child.material && !this.config.material) child.material.dispose()
		})

		// Remove event listeners
		if (this.scrollHandler) {
			this.lenis.off('scroll', this.scrollHandler)
		}
		if (this.resizeHandler) {
			window.removeEventListener('resize', this.resizeHandler)
		}

		// Disconnect observer
		if (this.observer) {
			this.observer.disconnect()
		}

		// Restore element visibility
		if (this.config.hideOriginal && this.element) {
			this.element.style.visibility = ''
		}
	}
}

export default WebGLText
