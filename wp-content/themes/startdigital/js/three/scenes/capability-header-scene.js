import * as THREE from 'three'
import BaseScene from '../base-scene.js'
import GradientMaterial from '../materials/gradient-material.js'
import WebGLManager from '../context-manager.js'
import Particles from '../particles/particles.js'
import Simulator from '../particles/simulator.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class CapabilityHeaderScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.cameraDistance = 150

		// Mouse tracking
		this.mouse = new THREE.Vector2(0, 0)
		this.mouse3d = new THREE.Vector3()
		this.targetMouse3d = new THREE.Vector3()
		this.mouseVelocity = 0
	}

	setupScene() {
		this.time = 0

		// Particle settings
		this.particleSettings = {
			speed: 200.0,
			dieSpeed: 2.0,
			radius: 1.6,
			curlSize: 0.0225,
			attraction: -6.0,
		}

		this.sphereRadius = 35
	}

	adjustCamera() {
		const isMobile = window.innerWidth < 640
		this.cameraDistance = isMobile ? 200 : 150
		this.camera.position.z = this.cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	createMaterials() {
		const { width, height } = this.container.getBoundingClientRect()
		this.gradientMaterial = new GradientMaterial()
		this.gradientMaterial.uniforms.resolution.value.set(width, height)
	}

	async createObjects() {
		// Create background
		const { width, height } = this.getFrustumDimensions(0)
		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.gradientMaterial)
		this.background.renderOrder = -1
		this.scene.add(this.background)

		// Initialize particle system
		const textureSize = 256

		this.simulator = new Simulator(textureSize, textureSize)
		this.simulator.init(WebGLManager.instance.renderer, this.particleSettings)

		// Create sphere position texture
		const sphereTexture = this.createSphereTexture(
			textureSize,
			this.sphereRadius
		)
		this.simulator.setPositionsFromTexture(sphereTexture)

		// Create particles
		this.particles = new Particles(this.simulator, textureSize, textureSize)
		this.particles.mesh.frustumCulled = false
		this.scene.add(this.particles.container)

		// Position particles initially at center
		this.particles.container.position.set(0, 10, 0)
	}

	createSphereTexture(textureSize, radius) {
		const amount = textureSize * textureSize
		const positions = new Float32Array(amount * 4)

		for (let i = 0; i < amount; i++) {
			const i4 = i * 4

			// Uniform sphere distribution using spherical coordinates
			const u = Math.random()
			const v = Math.random()
			const theta = 2 * Math.PI * u
			const phi = Math.acos(2 * v - 1)

			// Random radius for volume distribution (cube root for uniform volume)
			const r = radius * Math.cbrt(Math.random())

			positions[i4 + 0] = r * Math.sin(phi) * Math.cos(theta)
			positions[i4 + 1] = r * Math.sin(phi) * Math.sin(theta)
			positions[i4 + 2] = r * Math.cos(phi)
			positions[i4 + 3] = Math.random() // life
		}

		const texture = new THREE.DataTexture(
			positions,
			textureSize,
			textureSize,
			THREE.RGBAFormat,
			THREE.FloatType
		)

		texture.minFilter = THREE.NearestFilter
		texture.magFilter = THREE.NearestFilter
		texture.needsUpdate = true

		return texture
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

		// High-res shadow map
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
			}
		}

		window.addEventListener('mousemove', this.onMouseMove)
	}

	updateMouse3d() {
		if (!this.particles) return

		// Project mouse to z=0 plane using camera
		const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
		vector.unproject(this.camera)

		const dir = vector.sub(this.camera.position).normalize()
		const distance = -this.camera.position.z / dir.z
		this.targetMouse3d
			.copy(this.camera.position)
			.add(dir.multiplyScalar(distance))

		// Smooth follow - lerp towards target
		this.mouse3d.lerp(this.targetMouse3d, 0.08)
	}

	animate(deltaTime) {
		if (!this.isInitialized) return

		this.time += deltaTime

		if (this.gradientMaterial) {
			this.gradientMaterial.uniforms.time.value += deltaTime
		}

		if (!this.simulator || !this.particles) return

		// Store previous position
		const prevPos = this.mouse3d.clone()

		// Update mouse 3D position
		this.updateMouse3d()

		// Calculate velocity
		const dist = this.mouse3d.distanceTo(prevPos)
		if (dist < 500 && deltaTime > 0) {
			const velocityPerSecond = dist / deltaTime
			this.mouseVelocity =
				this.mouseVelocity * 0.85 + velocityPerSecond * 0.15 * 0.016
		}

		// Update simulator - pass mouse position relative to particles container
		const localMouse = this.mouse3d
			.clone()
			.sub(this.particles.container.position)

		this.simulator.update(deltaTime, {
			...this.particleSettings,
			mouse3d: localMouse,
			mouseVelocity: this.mouseVelocity,
		})

		// Update particle mesh
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
		this.adjustCamera()

		const { width: cw, height: ch } = this.container.getBoundingClientRect()

		if (this.gradientMaterial) {
			this.gradientMaterial.uniforms.resolution.value.set(cw, ch)
		}

		if (this.background) {
			const { width: fw, height: fh } = this.getFrustumDimensions(0)
			this.background.geometry.dispose()
			this.background.geometry = new THREE.PlaneGeometry(fw, fh, 1, 1)
		}

		ScrollTrigger.refresh()
	}

	dispose() {
		ScrollTrigger.getAll().forEach((st) => {
			if (st.trigger === this.container) st.kill()
		})

		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
		}

		if (this.gradientMaterial) this.gradientMaterial.dispose()
		this.simulator?.dispose()
		super.dispose()
	}
}

export default CapabilityHeaderScene
