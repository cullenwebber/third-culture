import * as THREE from 'three'
import quadVert from './shaders/quad.vert.js'
import throughFrag from './shaders/through.frag.js'
import positionFrag from './shaders/position.frag.js'
import hitFrag from './shaders/hit.frag.js'

class Simulator {
	constructor(textureWidth = 512, textureHeight = 512) {
		this.textureWidth = textureWidth
		this.textureHeight = textureHeight
		this.amount = textureWidth * textureHeight

		this.renderer = null
		this.scene = null
		this.camera = null
		this.mesh = null

		this.positionRenderTarget = null
		this.prevPositionRenderTarget = null

		this.copyShader = null
		this.positionShader = null
		this.hitShader = null
		this.textureDefaultPosition = null
		this.textureTargetPosition = null

		this.hitRenderTarget = null
		this.prevHitRenderTarget = null

		this.followPoint = new THREE.Vector3()
		this.followPointTime = 0
		this.time = 0

		this.initAnimation = 1.0
		this.morphProgress = 0.0
	}

	init(renderer, settings = {}) {
		try {
			this.renderer = renderer
			this.settings = settings

			// Setup scene
			this.scene = new THREE.Scene()
			this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

			// Create shaders
			this.createShaders()

			// Create mesh
			this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyShader)
			this.scene.add(this.mesh)

			// Create render targets
			const rtOptions = {
				wrapS: THREE.ClampToEdgeWrapping,
				wrapT: THREE.ClampToEdgeWrapping,
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				depthBuffer: false,
				stencilBuffer: false,
			}

			this.positionRenderTarget = new THREE.WebGLRenderTarget(
				this.textureWidth,
				this.textureHeight,
				rtOptions
			)
			this.prevPositionRenderTarget = new THREE.WebGLRenderTarget(
				this.textureWidth,
				this.textureHeight,
				rtOptions
			)

			// Create hit render targets for mouse interaction
			this.hitRenderTarget = new THREE.WebGLRenderTarget(
				this.textureWidth,
				this.textureHeight,
				rtOptions
			)
			this.prevHitRenderTarget = new THREE.WebGLRenderTarget(
				this.textureWidth,
				this.textureHeight,
				rtOptions
			)

			// Initialize positions
			this.textureDefaultPosition = this.createPositionTexture()
			this.copyTexture(this.textureDefaultPosition, this.positionRenderTarget)
			this.copyTexture(this.positionRenderTarget, this.prevPositionRenderTarget)
		} catch (error) {
			console.error('Simulator initialization failed:', error)
			throw error
		}
	}

	createShaders() {
		const resolution = new THREE.Vector2(this.textureWidth, this.textureHeight)

		// Copy shader
		this.copyShader = new THREE.ShaderMaterial({
			uniforms: {
				resolution: { value: resolution },
				tDiffuse: { value: null },
			},
			vertexShader: quadVert,
			fragmentShader: throughFrag,
		})

		// Position update shader
		this.positionShader = new THREE.ShaderMaterial({
			uniforms: {
				resolution: { value: resolution },
				texturePosition: { value: null },
				textureDefaultPosition: { value: null },
				textureTargetPosition: { value: null },
				textureHit: { value: null },
				mouse3d: { value: new THREE.Vector3() },
				mouseVelocity: { value: 0.0 },
				speed: { value: 1.0 },
				dieSpeed: { value: 0.0 },
				radius: { value: 0.0 },
				curlSize: { value: 0.0 },
				attraction: { value: 0.0 },
				time: { value: 0.0 },
				initAnimation: { value: 0.0 },
				morphProgress: { value: 0.0 },
			},
			vertexShader: quadVert,
			fragmentShader: positionFrag,
			blending: THREE.NoBlending,
			depthWrite: false,
			depthTest: false,
		})

		// Hit intensity shader (for mouse interaction white flash)
		this.hitShader = new THREE.ShaderMaterial({
			uniforms: {
				resolution: { value: resolution },
				texturePosition: { value: null },
				textureHit: { value: null },
				mouse3d: { value: new THREE.Vector3() },
				mouseVelocity: { value: 0.0 },
				decay: { value: 0.98 },
			},
			vertexShader: quadVert,
			fragmentShader: hitFrag,
			blending: THREE.NoBlending,
			depthWrite: false,
			depthTest: false,
		})
	}

	createPositionTexture() {
		const positions = new Float32Array(this.amount * 4)

		for (let i = 0; i < this.amount; i++) {
			const i4 = i * 4
			const r = (0.5 + Math.random() * 0.5) * 50
			const phi = (Math.random() - 0.5) * Math.PI
			const theta = Math.random() * Math.PI * 2

			positions[i4 + 0] = r * Math.cos(theta) * Math.cos(phi)
			positions[i4 + 1] = r * Math.sin(phi)
			positions[i4 + 2] = r * Math.sin(theta) * Math.cos(phi)
			positions[i4 + 3] = Math.random()
		}

		const texture = new THREE.DataTexture(
			positions,
			this.textureWidth,
			this.textureHeight,
			THREE.RGBAFormat,
			THREE.FloatType
		)

		texture.minFilter = THREE.NearestFilter
		texture.magFilter = THREE.NearestFilter
		texture.needsUpdate = true

		return texture
	}

	// Sample random points on a mesh surface
	sampleMeshSurface(geometry, count) {
		const posAttr = geometry.getAttribute('position')
		const indexAttr = geometry.getIndex()
		const positions = new Float32Array(count * 4)

		// Get triangle data
		const triangles = []
		const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3

		for (let i = 0; i < triCount; i++) {
			const i3 = i * 3
			let a, b, c

			if (indexAttr) {
				a = indexAttr.getX(i3)
				b = indexAttr.getX(i3 + 1)
				c = indexAttr.getX(i3 + 2)
			} else {
				a = i3
				b = i3 + 1
				c = i3 + 2
			}

			const vA = new THREE.Vector3().fromBufferAttribute(posAttr, a)
			const vB = new THREE.Vector3().fromBufferAttribute(posAttr, b)
			const vC = new THREE.Vector3().fromBufferAttribute(posAttr, c)

			// Calculate triangle area for weighted sampling
			const edge1 = new THREE.Vector3().subVectors(vB, vA)
			const edge2 = new THREE.Vector3().subVectors(vC, vA)
			const area = new THREE.Vector3().crossVectors(edge1, edge2).length() * 0.5

			triangles.push({ vA, vB, vC, area })
		}

		// Build cumulative distribution for weighted sampling
		let totalArea = 0
		const cumulativeAreas = triangles.map((t) => (totalArea += t.area))

		// Sample random points on surface
		for (let i = 0; i < count; i++) {
			const i4 = i * 4

			// Pick triangle weighted by area
			const r = Math.random() * totalArea
			let triIndex = cumulativeAreas.findIndex((a) => a >= r)
			if (triIndex < 0) triIndex = triangles.length - 1

			const tri = triangles[triIndex]

			// Random point in triangle (barycentric coordinates)
			let u = Math.random()
			let v = Math.random()
			if (u + v > 1) {
				u = 1 - u
				v = 1 - v
			}
			const w = 1 - u - v

			positions[i4 + 0] = tri.vA.x * w + tri.vB.x * u + tri.vC.x * v
			positions[i4 + 1] = tri.vA.y * w + tri.vB.y * u + tri.vC.y * v
			positions[i4 + 2] = tri.vA.z * w + tri.vB.z * u + tri.vC.z * v
			positions[i4 + 3] = Math.random() // life
		}

		return positions
	}

	// Load precomputed positions from binary file
	async loadPositionsFromBinary(url) {
		const response = await fetch(url)
		const buffer = await response.arrayBuffer()
		const positions = new Float32Array(buffer)

		const texture = new THREE.DataTexture(
			positions,
			this.textureWidth,
			this.textureHeight,
			THREE.RGBAFormat,
			THREE.FloatType
		)

		texture.minFilter = THREE.NearestFilter
		texture.magFilter = THREE.NearestFilter
		texture.needsUpdate = true

		return texture
	}

	// Create a texture from geometry
	createTextureFromGeometry(geometry, scale = 1) {
		const positions = this.sampleMeshSurface(geometry, this.amount)

		// Apply scale
		if (scale !== 1) {
			for (let i = 0; i < this.amount; i++) {
				const i4 = i * 4
				positions[i4 + 0] *= scale
				positions[i4 + 1] *= scale
				positions[i4 + 2] *= scale
			}
		}

		const texture = new THREE.DataTexture(
			positions,
			this.textureWidth,
			this.textureHeight,
			THREE.RGBAFormat,
			THREE.FloatType
		)

		texture.minFilter = THREE.NearestFilter
		texture.magFilter = THREE.NearestFilter
		texture.needsUpdate = true

		return texture
	}

	// Set initial positions from a loaded mesh/geometry (no animation)
	setPositionsFromGeometry(geometry, scale = 1) {
		const texture = this.createTextureFromGeometry(geometry, scale)

		// Replace default position texture
		this.textureDefaultPosition?.dispose()
		this.textureDefaultPosition = texture

		// Also set as target (no morphing initially)
		this.textureTargetPosition?.dispose()
		this.textureTargetPosition = this.createTextureFromGeometry(geometry, scale)

		// Reset morph progress
		this.morphProgress = 0.0

		// Reset particle positions to new shape
		this.copyTexture(this.textureDefaultPosition, this.positionRenderTarget)
		this.copyTexture(this.positionRenderTarget, this.prevPositionRenderTarget)
	}

	// Morph to a new geometry (for animation)
	morphToGeometry(geometry, scale = 1) {
		// Current target becomes new default
		if (this.textureTargetPosition) {
			this.textureDefaultPosition?.dispose()
			this.textureDefaultPosition = this.textureTargetPosition
		}

		// Create new target
		this.textureTargetPosition = this.createTextureFromGeometry(geometry, scale)

		// Reset morph progress (will be animated externally)
		this.morphProgress = 0.0
	}

	// Set positions from a precomputed texture (no animation)
	setPositionsFromTexture(texture) {
		// Clone the texture for default
		this.textureDefaultPosition?.dispose()
		this.textureDefaultPosition = texture.clone()
		this.textureDefaultPosition.needsUpdate = true

		// Also set as target
		this.textureTargetPosition?.dispose()
		this.textureTargetPosition = texture.clone()
		this.textureTargetPosition.needsUpdate = true

		// Reset morph progress
		this.morphProgress = 0.0

		// Reset particle positions
		this.copyTexture(this.textureDefaultPosition, this.positionRenderTarget)
		this.copyTexture(this.positionRenderTarget, this.prevPositionRenderTarget)
	}

	// Morph to a precomputed texture (for animation) - no computation during scroll
	morphToTexture(texture) {
		// Current target becomes new default
		if (this.textureTargetPosition) {
			this.textureDefaultPosition?.dispose()
			this.textureDefaultPosition = this.textureTargetPosition
		}

		// Set new target (clone to avoid shared reference issues)
		this.textureTargetPosition = texture.clone()
		this.textureTargetPosition.needsUpdate = true

		// Reset morph progress (will be animated externally)
		this.morphProgress = 0.0
	}

	copyTexture(input, output) {
		this.mesh.material = this.copyShader
		this.copyShader.uniforms.tDiffuse.value = input
		this.renderer.setRenderTarget(output)
		this.renderer.render(this.scene, this.camera)
		this.renderer.setRenderTarget(null)
	}

	updatePosition(dt) {
		// Ping-pong render targets
		;[this.positionRenderTarget, this.prevPositionRenderTarget] = [
			this.prevPositionRenderTarget,
			this.positionRenderTarget,
		]

		this.mesh.material = this.positionShader
		const uniforms = this.positionShader.uniforms

		uniforms.textureDefaultPosition.value = this.textureDefaultPosition
		uniforms.textureTargetPosition.value =
			this.textureTargetPosition || this.textureDefaultPosition
		uniforms.texturePosition.value = this.prevPositionRenderTarget.texture
		uniforms.textureHit.value = this.hitRenderTarget?.texture || null
		uniforms.morphProgress.value = this.morphProgress
		uniforms.time.value += dt * 0.001

		this.renderer.setRenderTarget(this.positionRenderTarget)
		this.renderer.render(this.scene, this.camera)
		this.renderer.setRenderTarget(null)
	}

	updateHit(mouse3d, mouseVelocity) {
		// Ping-pong hit render targets
		;[this.hitRenderTarget, this.prevHitRenderTarget] = [
			this.prevHitRenderTarget,
			this.hitRenderTarget,
		]

		this.mesh.material = this.hitShader
		const uniforms = this.hitShader.uniforms

		uniforms.texturePosition.value = this.positionRenderTarget.texture
		uniforms.textureHit.value = this.prevHitRenderTarget.texture
		uniforms.mouseVelocity.value = mouseVelocity || 0
		if (mouse3d) {
			uniforms.mouse3d.value.copy(mouse3d)
		} else {
			uniforms.mouse3d.value.set(9999, 9999, 9999)
		}

		this.renderer.setRenderTarget(this.hitRenderTarget)
		this.renderer.render(this.scene, this.camera)
		this.renderer.setRenderTarget(null)
	}

	update(dt, settings = {}) {
		// Check if initialized
		if (!this.positionShader || !this.renderer) return
		if (!settings.speed && !settings.dieSpeed) return

		const deltaRatio = dt / 16.6667
		const r = settings.isMobile ? 100 : 200
		const h = settings.isMobile ? 40 : 60

		const uniforms = this.positionShader.uniforms
		uniforms.speed.value = settings.speed * deltaRatio
		uniforms.dieSpeed.value = settings.dieSpeed * deltaRatio
		uniforms.radius.value = settings.radius || 0
		uniforms.curlSize.value = settings.curlSize || 0
		uniforms.attraction.value = settings.attraction || 0
		uniforms.initAnimation.value = this.initAnimation

		// Pass mouse position and velocity for interaction
		if (settings.mouse3d) {
			uniforms.mouse3d.value.copy(settings.mouse3d)
		} else {
			uniforms.mouse3d.value.set(9999, 9999, 9999) // Far away when no mouse
		}
		uniforms.mouseVelocity.value = settings.mouseVelocity || 0

		this.updatePosition(dt)
		this.updateHit(settings.mouse3d, settings.mouseVelocity)
	}

	dispose() {
		this.positionRenderTarget?.dispose()
		this.prevPositionRenderTarget?.dispose()
		this.hitRenderTarget?.dispose()
		this.prevHitRenderTarget?.dispose()
		this.textureDefaultPosition?.dispose()
		this.textureTargetPosition?.dispose()
		this.copyShader?.dispose()
		this.positionShader?.dispose()
		this.hitShader?.dispose()
		this.mesh?.geometry?.dispose()
	}
}

export default Simulator
