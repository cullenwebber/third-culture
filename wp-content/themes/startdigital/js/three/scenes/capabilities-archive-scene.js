import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import BaseScene from '../base-scene.js'
import WebGLManager from '../context-manager.js'
import Particles from '../particles/particles.js'
import Simulator from '../particles/simulator.js'
import { getStaticPath } from '../utils.js'
import { getLenis } from '../../utils/smooth-scroll.js'
import ScrollPinnedObject from '../utils/ScrollPinnedObject.js'
import WhiteBackgroundGridMaterial from '../materials/white-background-grid-material.js'

gsap.registerPlugin(ScrollTrigger)

class CapabilitiesArchiveScene extends BaseScene {
	constructor(id, container) {
		super(id, container)

		this.lenis = getLenis()
		this.direction = 1
		this.isTransitioning = false

		// Mouse tracking
		this.mouse = new THREE.Vector2(9999, 9999)
		this.prevMouse3d = new THREE.Vector3(9999, 9999, 9999)
		this.mouse3d = new THREE.Vector3()
		this.mouse3dLocal = new THREE.Vector3(9999, 9999, 9999)
		this.mouseVelocity = 0
		this.inverseMatrix = new THREE.Matrix4()

		// Listen for page transition to suppress velocity
		this.onPageTransitionOut = (e) => {
			this.isTransitioning = e.detail?.active ?? false
		}
		window.addEventListener('pageTransitionOut', this.onPageTransitionOut)
	}

	setupScene() {
		// Particle settings
		this.particleSettings = {
			speed: 200.0,
			dieSpeed: 30.0,
			radius: 1.6,
			curlSize: 0.035,
			attraction: -2.2,
		}

		// Custom particle colors for this scene
		this.particleColor1 = new THREE.Color(0xf2f2f2)
		this.particleColor2 = new THREE.Color(0xf2f2f2)
		this.particleShadowColor = new THREE.Vector4(0.3, 0.3, 0.4, 1.0) // Light gray for white bg

		// Store precomputed position textures for each shape
		this.shapeTextures = {}
		this.currentShape = 'brand'
		this.modelScale = 100
	}

	async createObjects() {
		const textureSize = 256

		// Initialize simulator
		this.simulator = new Simulator(textureSize, textureSize)
		this.simulator.init(WebGLManager.instance.renderer, this.particleSettings)

		// Create particles (hidden until model loads)
		this.particles = new Particles(this.simulator, textureSize, textureSize)
		this.particles.container.visible = false

		// Set custom particle colors and shadow
		this.particles.mesh.material.uniforms.color1.value = this.particleColor1
		this.particles.mesh.material.uniforms.color2.value = this.particleColor2
		this.particles.mesh.material.uniforms.shadowColor.value =
			this.particleShadowColor

		// Disable frustum culling to prevent particles from disappearing when partially offscreen
		this.particles.mesh.frustumCulled = false

		this.scene.add(this.particles.container)

		// Load all models
		await this.loadAllModels()

		// Set initial shape
		if (this.shapeTextures.brand) {
			this.simulator.setPositionsFromTexture(this.shapeTextures.brand)
		}

		this.particles.container.visible = true

		// Create background first (needed for scroll animations)
		this.createBackground()

		// Setup scroll animations
		this.setupScrollTriggers()
	}

	createBackground() {
		this.whiteMaterial = new WhiteBackgroundGridMaterial()
		const { width, height } = this.getFrustumDimensions(0)
		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.whiteMaterial)
		this.background.renderOrder = -1
		this.scene.add(this.background)
	}

	async loadAllModels() {
		// Load precomputed position data from binary files
		const models = [
			{ name: 'brand', file: 'brand-positions.bin' },
			{ name: 'campaign', file: 'campaign-positions.bin' },
			{ name: 'design', file: 'design-positions.bin' },
			{ name: 'digital', file: 'digital-positions.bin' },
		]

		const loadPromises = models.map(async ({ name, file }) => {
			try {
				const path = getStaticPath(`/${file}`)
				this.shapeTextures[name] = await this.simulator.loadPositionsFromBinary(
					path
				)
			} catch (error) {
				console.error(`Failed to load ${file}:`, error)
			}
		})

		await Promise.all(loadPromises)
	}

	transitionToShape(shapeName) {
		if (!this.shapeTextures[shapeName] || this.currentShape === shapeName)
			return

		this.currentShape = shapeName

		// Start morph to new shape using precomputed texture
		this.simulator.morphToTexture(this.shapeTextures[shapeName])

		// Animate morph progress
		gsap.to(this.simulator, {
			morphProgress: 1,
			duration: 0.95,
			ease: 'power2.inOut',
			onComplete: () => {
				// Make default match target and reset progress for normal behavior
				this.simulator.textureDefaultPosition =
					this.simulator.textureTargetPosition.clone()
				this.simulator.textureDefaultPosition.needsUpdate = true
				this.simulator.morphProgress = 0
			},
		})
	}

	setupScrollTriggers() {
		// Shape order matching service-text-0, service-text-1, etc.
		const shapes = ['brand', 'campaign', 'design', 'digital']

		shapes.forEach((shape, index) => {
			const element = document.querySelector(`#service-text-${index}`)
			if (!element) {
				console.warn(`Trigger element #service-text-${index} not found`)
				return
			}

			ScrollTrigger.create({
				trigger: element,
				start: 'top center',
				end: 'bottom center',
				onEnter: () => this.transitionToShape(shape),
				onLeaveBack: () => {
					// When leaving this section going up, show previous shape
					const prevShape = index > 0 ? shapes[index - 1] : shapes[0]
					this.transitionToShape(prevShape)
				},
			})
		})

		// Pin particles to center of viewport during scroll
		const container = document.querySelector('#service-scroll-container')
		const { height } = this.getFrustumDimensions()

		// Animate grid scroll
		const entirePage = document.querySelector('#entire-page')
		if (entirePage) {
			const ratio =
				entirePage.getBoundingClientRect().width / window.innerHeight

			ScrollTrigger.create({
				trigger: entirePage,
				start: 'top top',
				end: 'bottom bottom',
				scrub: true,
				onUpdate: (self) => {
					if (this.whiteMaterial) {
						this.whiteMaterial.uniforms.uScroll.value = -self.progress * ratio
					}
				},
			})
		}
	}

	createLights() {
		// Main directional light for shadows
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
		dirLight.position.set(0, 200, 200)
		dirLight.castShadow = true

		// Shadow camera setup
		dirLight.shadow.camera.left = -150
		dirLight.shadow.camera.right = 150
		dirLight.shadow.camera.top = 150
		dirLight.shadow.camera.bottom = -150
		dirLight.shadow.camera.near = 0.1
		dirLight.shadow.camera.far = 500

		// High-res shadow map for crisp shadows
		dirLight.shadow.mapSize.width = 1024 * 0.75
		dirLight.shadow.mapSize.height = 1024 * 0.75

		// Fix shadow acne with proper bias
		dirLight.shadow.bias = -0.001
		dirLight.shadow.normalBias = 0.4
		dirLight.shadow.radius = 4

		this.scene.add(dirLight)

		// Ambient light for overall brightness
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
		this.scene.add(ambientLight)
	}

	adjustCamera() {
		// Move camera back on mobile
		const isMobile = window.innerWidth < 640
		const cameraDistance = isMobile ? 220 : 150
		this.camera.position.set(0, 0, cameraDistance)
		this.camera.lookAt(0, 0, 0)
	}

	createMouseListeners() {
		this.onMouseMove = (event) => {
			const rect = this.container.getBoundingClientRect()
			// Check if mouse is within this container
			if (
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom
			) {
				this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
				this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
			} else {
				// Mouse outside - move far away
				this.mouse.x = 9999
				this.mouse.y = 9999
			}
		}

		// Listen on window to catch all mouse movement
		window.addEventListener('mousemove', this.onMouseMove)
	}

	updateMouse3d() {
		if (!this.particles) return

		// Project mouse to z=0 plane using camera
		const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
		vector.unproject(this.camera)

		const dir = vector.sub(this.camera.position).normalize()
		const distance = -this.camera.position.z / dir.z
		this.mouse3d.copy(this.camera.position).add(dir.multiplyScalar(distance))

		// Transform mouse to particles container local space
		this.inverseMatrix.copy(this.particles.container.matrixWorld).invert()
		this.mouse3dLocal.copy(this.mouse3d).applyMatrix4(this.inverseMatrix)

		// Store for next frame
		this.prevMouse3d.copy(this.mouse3dLocal)
	}

	animate(deltaTime) {
		if (!this.isInitialized || !this.simulator || !this.particles) return

		// Store previous mouse position before update
		const prevPos = this.mouse3dLocal.clone()

		// Update mouse 3D position
		this.updateMouse3d()

		// Calculate velocity from mouse position
		const dist = this.mouse3dLocal.distanceTo(prevPos)
		if (dist < 500 && deltaTime > 0) {
			const velocityPerSecond = dist / deltaTime
			this.mouseVelocity =
				this.mouseVelocity * 0.85 + velocityPerSecond * 0.15 * 0.016
		}

		// Rotate particles container (suppress velocity during page transition)
		const velocity = this.isTransitioning ? 0 : this.lenis.velocity || 0
		this.direction = velocity < 0 ? -1 : velocity > 0 ? 1 : this.direction
		this.particles.container.rotation.y +=
			this.direction * deltaTime * 0.3 + velocity * 0.0045

		// Update simulator with mouse position (in local space)
		this.simulator.update(deltaTime, {
			...this.particleSettings,
			mouse3d: this.mouse3dLocal,
			mouseVelocity: this.mouseVelocity,
		})

		// Update particle mesh uniforms
		this.particles.update(deltaTime)
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}

	onResize(width, height) {
		super.onResize(width, height)

		// Adjust camera for mobile
		this.adjustCamera()

		// Update background plane to fill viewport
		if (this.background) {
			const { width: frustumWidth, height: frustumHeight } =
				this.getFrustumDimensions(0)
			this.background.geometry.dispose()
			this.background.geometry = new THREE.PlaneGeometry(
				frustumWidth,
				frustumHeight,
				1,
				1
			)
		}

		// Update pinned particles with new frustum height
		if (this.pinnedParticles) {
			const { height: frustumHeight } = this.getFrustumDimensions()
			this.pinnedParticles.updateOffsets(frustumHeight, 0, -frustumHeight)
		}

		// Refresh scroll triggers
		ScrollTrigger.refresh()
	}

	dispose() {
		// Kill all ScrollTriggers for this scene
		ScrollTrigger.getAll().forEach((st) => st.kill())

		// Remove mouse listener
		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
		}

		// Remove page transition listener
		if (this.onPageTransitionOut) {
			window.removeEventListener('pageTransitionOut', this.onPageTransitionOut)
		}

		// Clean up pinned particles
		if (this.pinnedParticles) {
			this.pinnedParticles.destroy()
		}

		// Dispose precomputed textures
		Object.values(this.shapeTextures).forEach((tex) => tex?.dispose())

		if (this.whiteMaterial) this.whiteMaterial.dispose()
		this.simulator?.dispose()
		super.dispose()
	}
}

export default CapabilitiesArchiveScene
