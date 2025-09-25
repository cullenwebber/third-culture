import * as THREE from 'three'
import { Text } from 'troika-three-text'
import { getLenis } from '../../utils/smooth-scroll'

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
				'/wp-content/themes/startdigital/static/fonts/Bagoss.ttf',
			weightToFontMap: config.weightToFontMap || {},
			material: config.material,
			zPosition: config.zPosition || 0, // Add configurable z position
			...config,
		}

		this.enabled = true
		this.computedStyle = window.getComputedStyle(this.element)

		// Create text mesh
		this.createMesh()
		this.scene.add(this.mesh)

		this.setupListeners()
		this.updateText()

		if (this.config.hideOriginal) {
			this.element.style.opacity = 0
		}
	}

	createMesh() {
		// Get font from computed styles or config
		const fontWeight = this.computedStyle.fontWeight
		const font = this.config.weightToFontMap[fontWeight] || this.config.fontPath

		// Create Troika text mesh
		this.mesh = new Text()
		this.mesh.text = this.element.innerText
		this.mesh.font = font

		// Anchor from top-left like DOM elements
		this.mesh.anchorX = 'left'
		this.mesh.anchorY = 'top'

		// Create or use provided material
		if (this.config.material) {
			this.mesh.material = this.config.material
		} else {
			this.mesh.material = this.createMaterial()
		}

		// Apply text styling from computed styles
		this.applyTextStyles()
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
				transparent: true,
			})
		}
	}

	applyTextStyles() {
		const styles = this.computedStyle
		const rect = this.element.getBoundingClientRect()

		// Font size in pixels
		const fontSize = parseFloat(styles.fontSize)

		// Convert pixel font size to world units using the configured z position
		const worldSize = this.getWorldSizeFromPixels({ height: fontSize })
		this.mesh.fontSize = worldSize.height

		// Text alignment
		this.mesh.textAlign = styles.textAlign || 'left'

		// Letter spacing (convert to em units)
		const letterSpacing = parseFloat(styles.letterSpacing) || 0
		this.mesh.letterSpacing = letterSpacing / fontSize

		// Line height (convert to em units)
		const lineHeight = parseFloat(styles.lineHeight) || fontSize
		this.mesh.lineHeight = lineHeight / fontSize

		// Max width in world units
		const worldDimensions = this.getWorldSizeFromPixels({ width: rect.width })
		this.mesh.maxWidth = worldDimensions.width

		// White space handling
		this.mesh.whiteSpace = styles.whiteSpace || 'normal'

		// Color
		if (!this.config.material) {
			this.mesh.color = new THREE.Color(styles.color)
		}
	}

	updateText() {
		if (!this.enabled || !this.element) {
			this.mesh.visible = false
			return
		}

		this.mesh.visible = true

		// Update text content if changed
		const currentText = this.element.innerText
		if (this.mesh.text !== currentText) {
			this.mesh.text = currentText
		}

		// Get element and container rectangles
		const rect = this.element.getBoundingClientRect()
		const containerRect = this.getContainerRect()

		// Update text styles (in case they changed)
		this.applyTextStyles()

		// Calculate position relative to container
		const relativeLeft = rect.left - containerRect.left
		const relativeTop = rect.top - containerRect.top

		// Convert to NDC coordinates
		const ndcX = (relativeLeft / containerRect.width) * 2 - 1
		const ndcY = -((relativeTop / containerRect.height) * 2 - 1)

		// Convert to world coordinates using the configured z position
		const { width, height } = this.getFrustumDimensions(this.config.zPosition)
		const worldX = ndcX * (width / 2)
		const worldY = ndcY * (height / 2)

		// Set position with configured z position
		this.mesh.position.set(worldX, worldY, this.config.zPosition)

		// Trigger sync to ensure text geometry is updated
		this.mesh.sync()
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
		this.mesh.text = element.innerText
		this.updateText()
	}

	setMaterial(material) {
		this.mesh.material = material
	}

	getMaterial() {
		return this.mesh.material
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
		if (this.mesh.material.uniforms && this.mesh.material.uniforms.uProgress) {
			this.mesh.material.uniforms.uProgress.value = 1
		} else {
			this.mesh.material.opacity = 1
		}
		this.mesh.visible = true
	}

	hide(duration = 1.8) {
		if (this.mesh.material.uniforms && this.mesh.material.uniforms.uProgress) {
			// Animate shader uniform if available
			// Example: animate(this.mesh.material.uniforms.uProgress, { value: 0 }, { duration })
			this.mesh.material.uniforms.uProgress.value = 0
		} else {
			// Animate opacity for standard materials
			this.mesh.material.opacity = 0
		}
		// Optionally hide after animation
		setTimeout(() => {
			this.mesh.visible = false
		}, duration * 1000)
	}

	// Helper methods (same as TrackedPlane)
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
		// Use the configured z position for calculations
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

		// Dispose of mesh and material
		if (this.mesh.dispose) {
			this.mesh.dispose()
		}
		if (this.mesh.material && this.mesh.material.dispose) {
			this.mesh.material.dispose()
		}

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
