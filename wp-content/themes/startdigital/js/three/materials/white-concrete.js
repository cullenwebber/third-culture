import * as THREE from 'three'

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
			scrollOffset: new THREE.Vector2(0.0, 0.0), // New scroll uniform
		}

		this.options = { ...defaults, ...options }
		this.material = this.createMaterial()
		this.material.needsUpdate = true
	}

	createMaterial() {
		const vertexShader = /* glsl */ `
			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying vec3 vWorldPosition;

			void main() {
				vUv = uv;
				vNormal = normalize(normalMatrix * normal);
				vPosition = position;
				vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
				
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`

		const fragmentShader = /* glsl */ `
			uniform vec3 baseColor;
			uniform float roughness;
			uniform float metalness;
			uniform float time;
			uniform vec3 lightPosition;
			uniform vec2 scrollOffset; // New uniform for scroll
			
			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying vec3 vWorldPosition;

			// Simple, good quality noise
			float hash(vec2 p) {
				return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
			}

			float noise(vec2 p) {
				vec2 i = floor(p);
				vec2 f = fract(p);
				f = f * f * (3.0 - 2.0 * f); // smooth interpolation
				
				float a = hash(i);
				float b = hash(i + vec2(1.0, 0.0));
				float c = hash(i + vec2(0.0, 1.0));
				float d = hash(i + vec2(1.0, 1.0));
				
				return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
			}

			// Simple fbm
			float fbm(vec2 p) {
				float value = 0.0;
				float amplitude = 0.5;
				for (int i = 0; i < 4; i++) {
					value += amplitude * noise(p);
					p *= 2.0;
					amplitude *= 0.5;
				}
				return value;
			}

			// High frequency static noise
			float staticNoise(vec2 p) {
				return hash(p * 1.0) - 0.5;
			}

			// The key: good concrete patches
			float concretePatches(vec2 p) {
				// Large patches at different scales
				float patches1 = noise(p * 1.2);
				float patches2 = noise(p * 0.8 + vec2(100.0));
				float patches3 = noise(p * 0.5 + vec2(200.0));
				
				// Combine and bias toward lighter values
				float combined = (patches1 + patches2 + patches3) / 3.0;
				combined = pow(combined, 0.7); // More white areas
				
				return combined;
			}

			void main() {
				// Apply scroll offset to UV coordinates
				vec2 scrolledUv = vUv + scrollOffset;
				vec2 scaledUv = scrolledUv * 8.0;
				
				// Start with base color
				vec3 color = baseColor;
				
				float veryFineNoise = fbm(scaledUv);
				float veryFineNoise2 = fbm(scaledUv * 9.5 + vec2(100.0, 50.0));
				
				color = mix(color, color * 0.95, veryFineNoise * 0.3);
				color = mix(color, color * 1.05, veryFineNoise2 * 0.9);
				color = mix(color, vec3(0.97), veryFineNoise * 0.2);
				
				// Medium scale blobs
				float mediumBlobs = fbm(scaledUv * 0.2);
				float blobVariation = (mediumBlobs - 0.2) * 0.1;
				color = color * (1.0 + blobVariation);

                // Add subtle static noise
				float staticValue = staticNoise(scaledUv);
				color += staticValue * 0.15; // Very subtle static overlay
				
				// Large concrete patches - this is the important part
				float patches = concretePatches(scaledUv * 0.3);
				float patchVariation = (patches - 0.2) * 0.3;
				color = color * (1.0 + patchVariation);
				
				// Simple lighting
				vec3 lightDir = normalize(lightPosition);
				float NdotL = max(dot(vNormal, lightDir), 0.0);
				
				vec3 ambient = color * 0.25;
				vec3 diffuse = color * NdotL * 0.6;
				
				gl_FragColor = vec4(ambient + diffuse, 1.0);
			}
		`

		return new THREE.ShaderMaterial({
			uniforms: {
				baseColor: { value: new THREE.Color(this.options.baseColor) },
				roughness: { value: this.options.roughness },
				metalness: { value: this.options.metalness },
				time: { value: this.options.time },
				lightPosition: { value: this.options.lightPosition },
				scrollOffset: { value: this.options.scrollOffset }, // New uniform
			},
			vertexShader,
			fragmentShader,
		})
	}

	getMaterial() {
		return this.material
	}

	setTime(value) {
		this.material.uniforms.time.value = value
	}

	setScrollOffset(x, y) {
		this.material.uniforms.scrollOffset.value.set(x, y)
	}

	updateFromScroll(scrollX, scrollY, sensitivity = 0.001) {
		this.setScrollOffset(scrollX * sensitivity, scrollY * sensitivity)
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
			// Snap to final position and stop animating
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
