import * as THREE from 'three'

class GradientMaterial extends THREE.ShaderMaterial {
	constructor() {
		super()
		this.uniforms = {
			time: { value: 0 },
			resolution: { value: new THREE.Vector2() },
			progress: { value: 0 },
			gridSize: { value: 90.0 },
			dotSize: { value: 0.08 },
			dotOpacity: { value: 0.1 },
			uScroll: { value: 0 },
		}

		this.vertexShader = this.getVertexShader()
		this.fragmentShader = this.getFragmentShader()

		// Render behind everything else
		this.depthWrite = false
		this.depthTest = true
	}

	getVertexShader() {
		return /* glsl */ `
				varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`
	}

	getFragmentShader() {
		return /* glsl */ `
				uniform float time;
				uniform vec2 resolution;
				uniform float progress;
				uniform float gridSize;
				uniform float dotSize;
				uniform float dotOpacity;
				uniform float uScroll;
				varying vec2 vUv;

				// Random function from DotScreenShader
				float random(vec2 p) {
					vec2 k1 = vec2(
						23.14069263277926, // e^pi (Gelfond's constant)
						2.665144142690225 // 2^sqrt(2) (Gelfond–Schneider constant)
					);
					return fract(
						cos(dot(p, k1)) * 12345.6789
					);
				}

				float noise(vec2 st) {
					vec2 i = floor(st);
					vec2 f = fract(st);

					float a = random(i);
					float b = random(i + vec2(1.0, 0.0));
					float c = random(i + vec2(0.0, 1.0));
					float d = random(i + vec2(1.0, 1.0));

					vec2 u = f * f * (3.0 - 2.0 * f);

					return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
				}

				// SDF for a square/box shape
				float sdBox(vec2 p, vec2 size) {
					vec2 d = abs(p) - size;
					return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
				}

				void main() {
					vec2 uv = gl_FragCoord.xy / resolution.xy;

					// Define the gradient colors (0x030030 to 0x02001B)
					vec3 topColor = vec3(0.012,0.,0.188);
					vec3 bottomColor = vec3(0.008,0.,0.106);

					// Create base gradient from top to bottom
					vec3 gradient = mix(bottomColor, topColor, uv.y);

					// Add smooth noise
					float noiseValue = noise(uv * 1.5 + time * 0.2 + 44.0);

					// Add film grain (from DotScreenShader)
					vec2 uvrandom = uv;
					uvrandom.y *= random(vec2(uvrandom.y, time));
					float grain = random(uvrandom) * 0.1;

					// Mix noise and grain with gradient
					vec3 gradientWithEffects = gradient + (noiseValue - 0.5) * 0.2;

					// === SQUARE DOT GRID ===
					// Calculate aspect ratio from UV derivatives
					vec2 dotUv = vUv;
					dotUv.y += uScroll; // Scroll the grid
					vec2 ddx_uv = dFdx(dotUv);
					vec2 ddy_uv = dFdy(dotUv);
					float aspectRatio = length(ddx_uv) / length(ddy_uv);

					// Adjust UV coordinates to maintain square grid
					vec2 adjustedUv;
					if (aspectRatio < 1.0) {
						adjustedUv = vec2(dotUv.x, dotUv.y * aspectRatio);
					} else {
						adjustedUv = vec2(dotUv.x / aspectRatio, dotUv.y);
					}

					// Scale by grid size
					adjustedUv *= gridSize;

					// Create repeating 7x7 pattern for dots (same spacing as crosses)
					vec2 patternUv = mod(adjustedUv, 7.0);
					vec2 patternCell = floor(patternUv);
					vec2 patternLocal = fract(patternUv);

					float dotPattern = 0.0;

					// Check all 4 corners of current cell in the pattern
					for (int y = 0; y <= 1; y++) {
						for (int x = 0; x <= 1; x++) {
							vec2 corner = patternCell + vec2(float(x), float(y));
							vec2 wrappedCorner = mod(corner, 7.0);

							// Place dot at (0,0) of each 7x7 tile
							if (abs(wrappedCorner.x) < 0.01 && abs(wrappedCorner.y) < 0.01) {
								vec2 cornerLocalPos = patternLocal - vec2(float(x), float(y));

								// Square dot using SDF
								float boxSDF = sdBox(cornerLocalPos, vec2(dotSize));
								float dot = 1.0 - smoothstep(-0.001, 0.001, boxSDF);
								dotPattern = max(dotPattern, dot);
							}
						}
					}

					// Apply dots to gradient (brighten the gradient where dots are)
					vec3 colorWithDots = gradientWithEffects + vec3(dotPattern * dotOpacity);

					// Transition to solid bottom color based on progress
					vec3 color = mix(colorWithDots, (bottomColor + vec3(dotPattern * dotOpacity)), progress);

					gl_FragColor = vec4(color, 1.0);
				}
			`
	}
}

export default GradientMaterial
