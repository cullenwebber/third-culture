import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import WebGLManager from './context-manager'

gsap.registerPlugin(ScrollTrigger)

class BaseScene {
	constructor(id, container) {
		this.id = id
		this.container = container
		this.scene = new THREE.Scene()
		this.camera = null
		this.isVisible = false
		this.isInitialized = false
		this.time = 0
	}

	async init() {
		this.setupScene()
		this.show()
		this.createCamera()
		this.setupContainerTracking()
		this.adjustCamera()
		this.createMaterials()
		await this.createObjects()
		this.createLights()
		this.createScrollTriggers()
		this.createMouseListeners()
		this.updateVisibility()
		this.isInitialized = true
		return this
	}

	createCamera() {
		const rect = this.container.getBoundingClientRect()
		this.camera = new THREE.PerspectiveCamera(
			75,
			rect.width / rect.height,
			0.1,
			2000
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

	setupContainerTracking() {
		// Override in subclasses
	}

	onShow() {
		// Override in subclasses
	}

	createMaterials() {
		// Override in subclasses
	}

	async createObjects() {
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

	animate(deltaTime) {
		// Override in subclasses
	}

	preRender(renderer) {
		// Override in subclasses for pre-render passes (e.g., shadow maps)
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

	disposeMaterial(material) {
		// Dispose all textures on the material
		const textureKeys = [
			'map',
			'normalMap',
			'roughnessMap',
			'metalnessMap',
			'aoMap',
			'emissiveMap',
			'alphaMap',
			'bumpMap',
			'displacementMap',
			'envMap',
			'lightMap',
			'specularMap',
		]

		textureKeys.forEach((key) => {
			if (material[key]) {
				material[key].dispose()
			}
		})

		// Dispose uniforms textures (for ShaderMaterial)
		if (material.uniforms) {
			Object.values(material.uniforms).forEach((uniform) => {
				if (uniform.value && uniform.value.isTexture) {
					uniform.value.dispose()
				}
			})
		}

		material.dispose()
	}

	dispose() {
		this.isVisible = false

		// Kill all GSAP animations and ScrollTriggers for this scene
		if (this.tl) {
			this.tl.kill()
			this.tl = null
		}

		// Kill ScrollTriggers associated with this scene's container
		ScrollTrigger.getAll().forEach((trigger) => {
			if (
				this.container?.contains(trigger.trigger) ||
				trigger.trigger === this.container
			) {
				trigger.kill()
			}
		})

		// Kill any GSAP tweens on scene objects
		gsap.killTweensOf(this)

		this.scene.traverse((object) => {
			// Kill any GSAP tweens on this object
			gsap.killTweensOf(object)
			gsap.killTweensOf(object.position)
			gsap.killTweensOf(object.rotation)
			gsap.killTweensOf(object.scale)

			if (object.geometry) {
				object.geometry.dispose()
			}

			if (object.material) {
				if (Array.isArray(object.material)) {
					object.material.forEach((material) => this.disposeMaterial(material))
				} else {
					this.disposeMaterial(object.material)
				}
			}

			// Dispose render targets if present
			if (object.renderTarget) {
				object.renderTarget.dispose()
			}
		})

		// Clear the scene
		while (this.scene.children.length > 0) {
			this.scene.remove(this.scene.children[0])
		}

		// Clear references
		this.camera = null
		this.container = null
	}
}

export default BaseScene
