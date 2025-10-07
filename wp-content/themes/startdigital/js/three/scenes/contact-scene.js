import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import BaseScene from '../base-scene'
import WebGLManager from '../context-manager'
import particlesVertexShader from '../materials/shaders/particles-vert'
import particlesFragmentShader from '../materials/shaders/particles-frag'
import gpgpuParticlesShader from '../materials/shaders/particles-gpgpu'
import { getStaticPath } from '../utils'

class ContactScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.gpgpu = {}
		this.particles = {}
		this.baseGeometry = {}
	}

	setupScene() {}

	async createObjects() {
		this.configureLoader()

		const path = getStaticPath('/particle-logo.glb')
		// Load the model
		const gltf = await this.gltfLoader.loadAsync(path)

		// Get base geometry from model
		this.baseGeometry.instance = gltf.scene.children[0].geometry
		this.baseGeometry.instance.scale(3, 3, 3)
		this.baseGeometry.count =
			this.baseGeometry.instance.attributes.position.count

		// Setup GPGPU
		this.setupGPGPU()

		// Create particles
		this.createParticles()
	}

	configureLoader() {
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
		)
		this.gltfLoader = new GLTFLoader()
		this.gltfLoader.setDRACOLoader(dracoLoader)
	}

	setupGPGPU() {
		// Get renderer from WebGLManager
		const renderer = WebGLManager.instance.renderer
		if (!renderer) {
			console.error('Renderer not available')
			return
		}

		// Setup
		this.gpgpu.size = Math.ceil(Math.sqrt(this.baseGeometry.count))
		this.gpgpu.computation = new GPUComputationRenderer(
			this.gpgpu.size,
			this.gpgpu.size,
			renderer
		)

		// Base particles texture
		const baseParticlesTexture = this.gpgpu.computation.createTexture()

		for (let i = 0; i < this.baseGeometry.count; i++) {
			const i3 = i * 3
			const i4 = i * 4

			// Position based on geometry
			baseParticlesTexture.image.data[i4 + 0] =
				this.baseGeometry.instance.attributes.position.array[i3 + 0]
			baseParticlesTexture.image.data[i4 + 1] =
				this.baseGeometry.instance.attributes.position.array[i3 + 1]
			baseParticlesTexture.image.data[i4 + 2] =
				this.baseGeometry.instance.attributes.position.array[i3 + 2]
			baseParticlesTexture.image.data[i4 + 3] = Math.random()
		}

		// Particles variable
		this.gpgpu.particlesVariable = this.gpgpu.computation.addVariable(
			'uParticles',
			gpgpuParticlesShader,
			baseParticlesTexture
		)

		this.gpgpu.computation.setVariableDependencies(
			this.gpgpu.particlesVariable,
			[this.gpgpu.particlesVariable]
		)

		// Uniforms
		this.gpgpu.particlesVariable.material.uniforms.uTime = new THREE.Uniform(0)
		this.gpgpu.particlesVariable.material.uniforms.uDeltaTime =
			new THREE.Uniform(0)
		this.gpgpu.particlesVariable.material.uniforms.uBase = new THREE.Uniform(
			baseParticlesTexture
		)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence =
			new THREE.Uniform(0.25)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength =
			new THREE.Uniform(2)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency =
			new THREE.Uniform(0.75)

		// Init
		this.gpgpu.computation.init()
	}

	createParticles() {
		// Geometry
		const particlesUvArray = new Float32Array(this.baseGeometry.count * 2)
		const sizesArray = new Float32Array(this.baseGeometry.count)
		const positionsArray = new Float32Array(this.baseGeometry.count * 3)

		for (let i = 0; i < this.baseGeometry.count; i++) {
			const i2 = i * 2
			const i3 = i * 3

			// Calculate UV coordinates based on position in GPGPU texture
			const x = i % this.gpgpu.size
			const y = Math.floor(i / this.gpgpu.size)

			// UV
			const uvX = (x + 0.5) / this.gpgpu.size
			const uvY = (y + 0.5) / this.gpgpu.size

			particlesUvArray[i2 + 0] = uvX
			particlesUvArray[i2 + 1] = uvY

			// Size
			sizesArray[i] = Math.random()

			// Dummy position (will be overridden by shader)
			positionsArray[i3 + 0] = 0
			positionsArray[i3 + 1] = 0
			positionsArray[i3 + 2] = 0
		}

		this.particles.geometry = new THREE.BufferGeometry()
		this.particles.geometry.setDrawRange(0, this.baseGeometry.count)

		// Add the position attribute FIRST (Three.js expects this)
		this.particles.geometry.setAttribute(
			'position',
			new THREE.BufferAttribute(positionsArray, 3)
		)

		this.particles.geometry.setAttribute(
			'aParticlesUv',
			new THREE.BufferAttribute(particlesUvArray, 2)
		)

		// Create default white colors if color attribute doesn't exist
		const colorsArray = new Float32Array(this.baseGeometry.count * 3)
		for (let i = 0; i < this.baseGeometry.count; i++) {
			const i3 = i * 3
			colorsArray[i3 + 0] = 0.1 // R
			colorsArray[i3 + 1] = 0.1 // G
			colorsArray[i3 + 2] = 0.1 // B
		}
		this.particles.geometry.setAttribute(
			'aColor',
			new THREE.BufferAttribute(colorsArray, 3)
		)

		this.particles.geometry.setAttribute(
			'aSize',
			new THREE.BufferAttribute(sizesArray, 1)
		)

		// Get canvas size for resolution
		const rect = this.container.getBoundingClientRect()
		const pixelRatio = Math.min(window.devicePixelRatio, 2)

		// Material
		this.particles.material = new THREE.ShaderMaterial({
			vertexShader: particlesVertexShader,
			fragmentShader: particlesFragmentShader,
			uniforms: {
				uSize: new THREE.Uniform(0.01),
				uResolution: new THREE.Uniform(
					new THREE.Vector2(rect.width * pixelRatio, rect.height * pixelRatio)
				),
				uParticlesTexture: new THREE.Uniform(),
			},
		})

		// Points
		this.particles.points = new THREE.Points(
			this.particles.geometry,
			this.particles.material
		)

		this.particles.points.position.y = 0.3
		this.particles.points.position.x = -0.7

		this.scene.add(this.particles.points)
	}

	animate(deltaTime) {
		this.time += deltaTime

		if (this.gpgpu.particlesVariable && this.gpgpu.computation) {
			this.gpgpu.particlesVariable.material.uniforms.uTime.value = this.time
			this.gpgpu.particlesVariable.material.uniforms.uDeltaTime.value =
				deltaTime
			this.gpgpu.computation.compute()

			this.particles.material.uniforms.uParticlesTexture.value =
				this.gpgpu.computation.getCurrentRenderTarget(
					this.gpgpu.particlesVariable
				).texture
		}
	}

	onResize() {
		super.onResize()

		// Update resolution uniform
		if (this.particles.material) {
			const rect = this.container.getBoundingClientRect()
			const pixelRatio = Math.min(window.devicePixelRatio, 2)

			this.particles.material.uniforms.uResolution.value.set(
				rect.width * pixelRatio,
				rect.height * pixelRatio
			)
		}
	}

	dispose() {
		// Dispose GPGPU resources
		if (this.gpgpu.computation) {
			this.gpgpu.computation.dispose()
		}

		// Call parent dispose
		super.dispose()
	}
}

export default ContactScene
