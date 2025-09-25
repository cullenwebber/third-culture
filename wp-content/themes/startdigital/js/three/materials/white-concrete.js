import * as THREE from 'three'
import concreteFragment from './shaders/concrete-fragment'

class ConcreteShaderMaterial {
	constructor(options = {}) {
		this.currentLightPosition = new THREE.Vector3(1.0, 1.0, 2.0)
		this.targetLightPosition = new THREE.Vector3(1.0, 1.0, 2.0)
		const defaults = {
			baseColor: 0xffffff,
			roughness: 0.85,
			metalness: 0.02,
			time: 0.0,
			lightPosition: this.targetLightPosition.clone(),
		}

		this.options = { ...defaults, ...options }
		this.material = this.createMaterial()
		this.material.needsUpdate = true
	}

	createMaterial() {
		const vertexShader = /* glsl */ `
		#include <fog_pars_vertex>
		#include <clipping_planes_pars_vertex>

		varying vec2 vUv;
		varying vec3 vNormal;
		varying vec3 vPosition;
		varying vec3 vWorldPosition;

		void main() {
			vUv = uv;
			vNormal = normalize(normalMatrix * normal);
			vPosition = position;
			vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
			
			vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
			gl_Position = projectionMatrix * mvPosition;
			
			#include <fog_vertex>
			#include <clipping_planes_vertex>
		}
	`

		const fragmentShader = /* glsl */ `
		#include <fog_pars_fragment>
		#include <clipping_planes_pars_fragment>
		uniform vec3 baseColor;
		uniform float roughness;
		uniform float metalness;
		uniform float time;
		uniform vec3 lightPosition;
		
		varying vec2 vUv;
		varying vec3 vNormal;
		varying vec3 vPosition;
		varying vec3 vWorldPosition;

		// Function to create concrete
		${concreteFragment}

		void main() {
			#include <clipping_planes_fragment>

			vec2 scaledUv = vUv * 8.0;
			vec3 concreteColor = generateConcreteTexture(baseColor, scaledUv);
			
			vec3 lightDir = normalize(lightPosition);
			float NdotL = max(dot(vNormal, lightDir), 0.0);
			
			vec3 ambient = concreteColor * 0.25;
			vec3 diffuse = concreteColor * NdotL * 0.6;
			
			gl_FragColor = vec4(ambient + diffuse, 1.0);
			
			#include <fog_fragment>
		}
	`

		return new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib.fog, // This adds all fog uniforms automatically
				{
					baseColor: { value: new THREE.Color(this.options.baseColor) },
					roughness: { value: this.options.roughness },
					metalness: { value: this.options.metalness },
					time: { value: this.options.time },
					lightPosition: { value: this.options.lightPosition },
				},
			]),
			vertexShader,
			fragmentShader,
			fog: true,
		})
	}

	getMaterial() {
		return this.material
	}

	setTime(value) {
		this.material.uniforms.time.value = value
	}

	setClippingPlane(planes) {
		this.material.clipping = true
		this.material.clippingPlanes = planes
	}

	animateLight(targetPosition) {
		this.targetLightPosition.copy(targetPosition)

		if (!this.isAnimating) {
			this.isAnimating = true
			this.updateLightPosition()
		}
	}

	updateLightPosition() {
		this.currentLightPosition.lerp(this.targetLightPosition, 0.03)
		this.material.uniforms.lightPosition.value.copy(this.currentLightPosition)

		const distance = this.currentLightPosition.distanceTo(
			this.targetLightPosition
		)

		if (distance > 0.001) {
			requestAnimationFrame(() => this.updateLightPosition())
		} else {
			this.currentLightPosition.copy(this.targetLightPosition)
			this.material.uniforms.lightPosition.value.copy(this.currentLightPosition)
			this.isAnimating = false
		}
	}

	update(deltaTime) {
		this.material.uniforms.time.value += deltaTime
	}

	dispose() {
		this.material.dispose()
	}
}

export default ConcreteShaderMaterial
