import * as THREE from 'three'

class BackgroundShaderMaterial {
	constructor(options = {}) {
		const defaults = {
			color: new THREE.Color(0x1e1e1e),
			time: 0.0,
			aspectRatio: window.innerWidth / window.innerHeight,
			gridSize: 30.0,
			gridOpacity: 0.15,
			vignetteStrength: 1.0,
		}

		this.options = { ...defaults, ...options }
		this.material = this.createMaterial()
	}

	createMaterial() {
		const vertexShader = /* glsl */ `
			varying vec2 vUv;
			
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`

		const fragmentShader = /* glsl */ `
			uniform vec3 color;
			uniform float time;
			uniform float aspectRatio;
			uniform float gridSize;
			uniform float gridOpacity;
			uniform float vignetteStrength;
			varying vec2 vUv;
			
			// Noise functions for organic smoke-like patterns
			float hash(vec2 p) {
				return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
			}
			
			float noise(vec2 p) {
				vec2 i = floor(p);
				vec2 f = fract(p);
				vec2 u = f * f * (3.0 - 2.0 * f);
				
				return mix(
					mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
					mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
					u.y
				);
			}
			
			// Fractal Brownian Motion for complex smoke patterns
			float fbm(vec2 p) {
				float value = 0.0;
				float amplitude = 0.5;
				float frequency = 2.0;
				
				for (int i = 0; i < 6; i++) {
					value += amplitude * noise(p * frequency);
					amplitude *= 0.5;
					frequency *= 2.0;
				}
				
				return value;
			}
			
			// Turbulence for more chaotic smoke movement
			float turbulence(vec2 p) {
				return abs(fbm(p) - 0.5) * 2.0;
			}
			

            float grid(vec2 uv, float size) {
                // Adjust UV coordinates to maintain square grid
                vec2 adjustedUv;
                
                if (aspectRatio < 1.0) {
                    // Wide screen (width > height): scale Y dimension UP
                    adjustedUv = vec2(uv.x, uv.y * aspectRatio);
                } else {
                    // Tall screen (height > width): scale X dimension UP  
                    adjustedUv = vec2(uv.x * aspectRatio, uv.y);
                }
                
                // Scale by grid size
                adjustedUv *= size;
                
                // Create grid lines
                vec2 gridUv = fract(adjustedUv);
                vec2 gridLines = abs(gridUv - 0.5);
                
                // Grid line thickness
                float lineWidth = 0.01;
                float gridX = step(0.5 - lineWidth, gridLines.x);
                float gridY = step(0.5 - lineWidth, gridLines.y);
                
                return max(gridX, gridY);
            }

			// Vignette function
			float vignette(vec2 uv) {
				// Center the coordinates
				vec2 center = vec2(0.5);
				float dist = distance(uv, center);
				
				// Create smooth vignette falloff
				float vignette = 1.0 - smoothstep(0.3, 0.8, dist);
				return vignette;
			}
			
			void main() {
				vec2 uv = vUv;
				
				// Adjust UV for aspect ratio to prevent stretching
				vec2 adjustedUv = vec2(uv.x * aspectRatio, uv.y);
				
				// Center the coordinates
				vec2 center = vec2(0.5 * aspectRatio, 0.5);
				vec2 pos = adjustedUv - center;
				
				// Distance from center for radial effects
				float dist = length(pos);
				float angle = atan(pos.y, pos.x);
				
				// Time-based animation
				float t = time * 0.3;
				
				// Create multiple layers of animated noise
				vec2 noisePos1 = pos * 3.0 + vec2(t * 0.5, t * 0.3);
				vec2 noisePos2 = pos * 5.0 + vec2(-t * 0.7, t * 0.4);
				vec2 noisePos3 = pos * 8.0 + vec2(t * 0.2, -t * 0.6);
				
				// Generate multiple noise layers for depth
				float noise1 = fbm(noisePos1);
				float noise2 = turbulence(noisePos2) * 0.1;
				float noise3 = fbm(noisePos3) * 0.7;
				
				// Combine noise layers
				float smokeNoise = noise1 + noise2 + noise3;
				
				// Generate grid
				float gridPattern = grid(uv, gridSize);
				
				// Generate vignette
				float vignetteEffect = vignette(uv);
				
				// Combine all elements
				float voidIntensity = smokeNoise;
				
				vec3 voidColor = color;
				voidColor += vec3(0.1) * smokeNoise;
				
				// Add subtle grid overlay
				voidColor += vec3(gridPattern * gridOpacity * 0.3);
				
				// Apply vignette (darken edges)
				voidColor *= mix(1.0 - vignetteStrength, 1.0, vignetteEffect);
				
				// Ensure it stays very dark (void-like)
				voidColor = clamp(voidColor, vec3(0.0), vec3(0.15));
				
				// Final intensity modulation with vignette applied to alpha as well
				float finalAlpha = clamp(voidIntensity * vignetteEffect, 0.0, 1.0);
				
				gl_FragColor = vec4(voidColor, finalAlpha);
			}
		`

		return new THREE.ShaderMaterial({
			uniforms: {
				color: { value: this.options.color },
				time: { value: this.options.time },
				aspectRatio: { value: this.options.aspectRatio },
				gridSize: { value: this.options.gridSize },
				gridOpacity: { value: this.options.gridOpacity },
				vignetteStrength: { value: this.options.vignetteStrength },
			},
			vertexShader,
			fragmentShader,
			transparent: true,
			side: THREE.DoubleSide,
		})
	}

	getMaterial() {
		return this.material
	}

	updateTime(value) {
		this.material.uniforms.time.value = value
	}

	updateAspectRatio(aspectRatio) {
		this.material.uniforms.aspectRatio.value = aspectRatio
	}

	updateGridSize(value) {
		this.material.uniforms.gridSize.value = value
	}

	updateGridOpacity(value) {
		this.material.uniforms.gridOpacity.value = value
	}

	updateVignetteStrength(value) {
		this.material.uniforms.vignetteStrength.value = value
	}
}

export default BackgroundShaderMaterial
