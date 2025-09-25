import { PlaneGeometry, Mesh, MeshBasicMaterial } from 'three'
import * as THREE from 'three'
import { getLenis } from '../../utils/smooth-scroll'
import ImageMaterial from '../materials/image-material'

class TrackedPlane {
	constructor(scene, camera, element, container = null, config = {}) {
		this.scene = scene
		this.camera = camera
		this.element = element
		this.lenis = getLenis()
		this.container = container

		// Configuration options
		this.config = {
			material: config.material,
			zPosition: config.zPosition || 0,
			...config,
		}

		this.material = this.config.material || this.createMaterial()
		this.enabled = true

		this.smoothVelocity = 0
		this.velocityLerpFactor = 0.1

		this.geometry = new PlaneGeometry(1, 1, 16, 16)
		this.mesh = new Mesh(this.geometry, this.material)
		this.scene.add(this.mesh)

		this.setupListeners()
		this.updatePlane()
	}

	updatePlane() {
		if (!this.enabled || !this.element) {
			this.mesh.visible = false
			return
		}

		this.mesh.visible = true

		const rect = this.element.getBoundingClientRect()
		const containerRect = this.getContainerRect()

		// Get world dimensions from pixel dimensions using configured z position
		const worldDimensions = this.getWorldSizeFromPixels({
			width: rect.width,
			height: rect.height,
		})

		// Update geometry with new dimensions
		this.geometry.dispose()
		this.geometry = new PlaneGeometry(
			worldDimensions.width,
			worldDimensions.height,
			16,
			16
		)
		this.mesh.geometry = this.geometry

		// Update material uniforms with new quad size
		if (this.imageMaterial) {
			this.imageMaterial.material.uniforms.uQuadSize.value = new THREE.Vector2(
				worldDimensions.width,
				worldDimensions.height
			)
		}

		// Calculate center position relative to the container
		const centerX = rect.left + rect.width / 2 - containerRect.left
		const centerY = rect.top + rect.height / 2 - containerRect.top

		// Convert to NDC coordinates using container dimensions
		const ndcX = (centerX / containerRect.width) * 2 - 1
		const ndcY = -((centerY / containerRect.height) * 2 - 1)

		// Convert to world coordinates using the configured z position
		const { width, height } = this.getFrustumDimensions(this.config.zPosition)
		const worldX = ndcX * (width / 2)
		const worldY = ndcY * (height / 2)

		// Set position with configured z position
		this.mesh.position.set(worldX, worldY, this.config.zPosition)

		const viewportHeight = window.innerHeight
		const elementCenterY = rect.top + rect.height / 2
		const viewportPosition = elementCenterY / viewportHeight

		if (this.imageMaterial) {
			this.imageMaterial.material.uniforms.uQuadSize.value = new THREE.Vector2(
				worldDimensions.width,
				worldDimensions.height
			)

			this.imageMaterial.setViewportPosition(viewportPosition)
		}
	}

	createMaterial() {
		const rect = this.element.getBoundingClientRect()
		const imgElement = this.element.querySelector('img')

		if (!imgElement) {
			return new MeshBasicMaterial({ color: 0xff0000 })
		}

		const imageSrc = imgElement.src

		this.imageMaterial = new ImageMaterial({
			uTexture: new THREE.Texture(),
			uTextureSize: new THREE.Vector2(1024, 1024),
			uQuadSize: new THREE.Vector2(rect.width, rect.height),
			uViewportSize: new THREE.Vector2(window.innerWidth, window.innerHeight),
			uViewportPosition: 0.0,
		})

		// Load the texture
		const textureLoader = new THREE.TextureLoader()
		textureLoader.load(
			imageSrc,
			(loadedTexture) => {
				this.imageMaterial.material.uniforms.uTexture.value = loadedTexture
				this.imageMaterial.material.uniforms.uTextureSize.value =
					new THREE.Vector2(
						loadedTexture.image.width,
						loadedTexture.image.height
					)
				// Trigger a render update
				this.material.needsUpdate = true
			},
			undefined, // onProgress
			(error) => {
				console.error('Error loading texture:', error)
			}
		)

		return this.imageMaterial.getMaterial()
	}

	setupListeners() {
		this.lenis.on('scroll', () => {
			this.updatePlane()

			this.smoothVelocity = THREE.MathUtils.lerp(
				this.smoothVelocity,
				this.lenis.velocity,
				this.velocityLerpFactor
			)

			this.imageMaterial.setScrollVelocity(this.smoothVelocity)
		})
		window.addEventListener('resize', this.updatePlane.bind(this))
	}

	enable() {
		this.enabled = true
		this.updatePlane()
	}

	disable() {
		this.enabled = false
		this.mesh.visible = false
	}

	setMaterial(material) {
		this.material = material
		this.mesh.material = material
	}

	setElement(element) {
		this.element = element
		this.updatePlane()
	}

	getMaterial() {
		return this.material
	}

	getImageMaterial() {
		return this.imageMaterial
	}

	// Method to update z position after instantiation
	setZPosition(zPosition) {
		this.config.zPosition = zPosition
		this.updatePlane() // Recalculate position and size with new z value
	}

	getZPosition() {
		return this.config.zPosition
	}

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
		this.scene.remove(this.mesh)
		this.geometry.dispose()
		if (this.material.dispose) {
			this.material.dispose()
		}
		if (this.imageMaterial && this.imageMaterial.dispose) {
			this.imageMaterial.dispose()
		}
		this.lenis.off('scroll', this.updatePlane.bind(this))
		window.removeEventListener('resize', this.updatePlane.bind(this))
	}
}

export default TrackedPlane
