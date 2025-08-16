import * as THREE from 'three'
import WebGLManager from './context-manager'

class BaseScene {
	constructor(id, container) {
		this.id = id
		this.container = container
		this.scene = new THREE.Scene()
		this.camera = null
		this.isVisible = false
		this.isInitialized = false
	}

	init() {
		this.setupScene()
		this.show()
		this.createCamera()
		this.adjustCamera()
		this.createMaterials()
		this.createObjects()
		this.createLights()
		this.createScrollTriggers()
		this.createMouseListeners()
		this.isInitialized = true
		return this
	}

	createCamera() {
		const rect = this.container.getBoundingClientRect()
		this.camera = new THREE.PerspectiveCamera(
			75,
			rect.width / rect.height,
			0.1,
			1000
		)
		this.camera.position.z = 5
	}

	updateVisibility() {
		const containerRect = this.container.getBoundingClientRect()
		const canvasRect = WebGLManager.instance.canvasRect

		// Check if container intersects with canvas
		const isIntersecting = !(
			containerRect.bottom < canvasRect.top ||
			containerRect.top > canvasRect.bottom ||
			containerRect.right < canvasRect.left ||
			containerRect.left > canvasRect.right
		)

		if (isIntersecting && !this.isVisible) {
			this.show()
		} else if (!isIntersecting && this.isVisible) {
			this.hide()
		}
	}

	show() {
		this.isVisible = true
		WebGLManager.instance.addVisibleScene(this.id)
		this.onShow()
	}

	hide() {
		this.isVisible = false
		WebGLManager.instance.removeVisibleScene(this.id)
	}

	setupScene() {
		// Override in subclasses
	}

	onShow() {
		// Override in subclasses
	}

	createMaterials() {
		// Override in subclasses
	}

	createObjects() {
		// Override in subclasses
	}

	createLights() {
		// Override in subclasses
	}

	createMouseListeners() {
		// Override in subsclasses
	}

	createScrollTriggers() {
		// Override in subsclasses
	}

	adjustCamera() {
		// Override in subsclasses
	}

	onResize(width, height) {
		this.updateCameraAspect()
	}

	updateCameraAspect() {
		const rect = this.container.getBoundingClientRect()
		this.camera.aspect = rect.width / rect.height
		this.camera.updateProjectionMatrix()
	}

	updateCameraForViewport(viewportWidth, viewportHeight) {
		const newAspect = viewportWidth / viewportHeight
		if (Math.abs(this.camera.aspect - newAspect) > 0.001) {
			this.camera.aspect = newAspect
			this.camera.updateProjectionMatrix()
		}
	}

	animate(deltaTime) {
		// Override in subclasses
	}

	dispose() {
		// Dispose of Three.js objects
		this.scene.traverse((object) => {
			if (object.geometry) object.geometry.dispose()
			if (object.material) {
				if (Array.isArray(object.material)) {
					object.material.forEach((material) => material.dispose())
				} else {
					object.material.dispose()
				}
			}
		})
	}
}

export default BaseScene
