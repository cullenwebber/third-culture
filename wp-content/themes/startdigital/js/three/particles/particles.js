import * as THREE from 'three'

import particlesVert from './shaders/particlesVert'
import particlesFrag from './shaders/particlesFrag'
import particlesDistanceVert from './shaders/particlesDistanceVert'
import particlesDistanceFrag from './shaders/particlesDistanceFrag'
import particlesDepthVert from './shaders/particlesDepthVert'
import particlesDepthFrag from './shaders/particlesDepthFrag'

class Particles {
	constructor(simulator, textureWidth = 512, textureHeight = 512) {
		this.simulator = simulator
		this.container = new THREE.Object3D()
		this.color1 = new THREE.Color(0xb0aec9)
		this.color2 = new THREE.Color(0x030030)
		this.shadowColor = new THREE.Vector4(0.008, 0.0, 0.07, 1.0) // #02001B default
		this.textureWidth = textureWidth
		this.textureHeight = textureHeight
		this.amount = textureWidth * textureHeight
		this.radius = 1.2
		this.mesh = null

		this.createParticleMesh()
	}

	createParticleMesh() {
		const position = new Float32Array(this.amount * 3)

		for (let i = 0; i < this.amount; i++) {
			const i3 = i * 3
			position[i3 + 0] = (i % this.textureWidth) / this.textureWidth
			position[i3 + 1] = ~~(i / this.textureWidth) / this.textureHeight
		}

		const geometry = new THREE.BufferGeometry()
		geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))

		const material = new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib.lights,
				THREE.UniformsLib.fog,
				{
					texturePosition: { value: null },
					textureHit: { value: null },
					morphProgress: { value: 0.0 },
					color1: { value: this.color1 },
					color2: { value: this.color2 },
					shadowColor: { value: this.shadowColor },
				},
			]),
			vertexShader: particlesVert,
			fragmentShader: particlesFrag,
			transparent: true,
			depthTest: true,
			depthWrite: true,
			lights: true,

			defines: {
				USE_SHADOWMAP: '',
			},
		})

		this.mesh = new THREE.Points(geometry, material)

		this.mesh.customDistanceMaterial = new THREE.ShaderMaterial({
			uniforms: {
				lightPos: { value: new THREE.Vector3(0, 0, 0) },
				texturePosition: { value: null },
			},
			vertexShader: particlesDistanceVert,
			fragmentShader: particlesDistanceFrag,
			depthTest: true,
			depthWrite: true,
			side: THREE.BackSide,
			blending: THREE.NoBlending,
		})

		// For directional light shadows
		this.mesh.customDepthMaterial = new THREE.ShaderMaterial({
			uniforms: {
				texturePosition: { value: null },
			},
			vertexShader: particlesDepthVert,
			fragmentShader: particlesDepthFrag,
			depthTest: true,
			depthWrite: true,
			blending: THREE.NoBlending,
		})

		this.mesh.castShadow = true
		this.mesh.receiveShadow = true
		this.container.add(this.mesh)

		return this.mesh
	}

	update(dt) {
		if (!this.mesh || !this.simulator.positionRenderTarget) return

		const positionTexture = this.simulator.positionRenderTarget.texture
		const hitTexture = this.simulator.hitRenderTarget?.texture

		this.mesh.material.uniforms.texturePosition.value = positionTexture
		this.mesh.material.uniforms.morphProgress.value = this.simulator.morphProgress
		if (hitTexture) {
			this.mesh.material.uniforms.textureHit.value = hitTexture
		}
		this.mesh.customDistanceMaterial.uniforms.texturePosition.value =
			positionTexture
		this.mesh.customDepthMaterial.uniforms.texturePosition.value =
			positionTexture

		if (this.mesh.material.uniforms.flipRatio) {
			this.mesh.material.uniforms.flipRatio.value ^= 1
			this.mesh.customDistanceMaterial.uniforms.flipRatio.value ^= 1
			if (this.mesh.motionMaterial) {
				this.mesh.motionMaterial.uniforms.flipRatio.value ^= 1
			}
		}
	}

	dispose() {
		if (this.mesh) {
			this.mesh.geometry?.dispose()
			this.mesh.material?.dispose()
			this.mesh.customDistanceMaterial?.dispose()
			this.mesh.customDepthMaterial?.dispose()
			if (this.mesh.motionMaterial) {
				this.mesh.motionMaterial.dispose()
			}
		}
		if (this.simulator) {
			this.simulator.dispose()
		}
	}
}

export default Particles
