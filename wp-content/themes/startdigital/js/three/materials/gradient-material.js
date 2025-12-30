import * as THREE from 'three'

class GradientMaterial extends THREE.ShaderMaterial {
	constructor() {
		super()
		this.uniforms = {
			time: { value: 0 },
			resolution: { value: new THREE.Vector2() },
			progress: { value: 0 },
			gridSize: { value: 45.0 },
			gridOpacity: { value: 0.08 },
			plusSize: { value: 0.2 },
			plusThickness: { value: 0.02 },
			plusOpacity: { value: 0.1 },
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
				uniform float gridOpacity;
				uniform float plusSize;
				uniform float plusThickness;
				uniform float plusOpacity;
				uniform float uScroll;
				varying vec2 vUv;

				// Random function
				float random(vec2 p) {
					vec2 k1 = vec2(
						23.14069263277926,
						2.665144142690225
					);
					return fract(cos(dot(p, k1)) * 12345.6789);
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

				// SDF for a plus/cross shape
				float sdPlus(vec2 p, float size, float thickness) {
					vec2 d = abs(p) - vec2(size, thickness);
					float horizontal = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);

					d = abs(p) - vec2(thickness, size);
					float vertical = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);

					return min(horizontal, vertical);
				}

				// Grid pattern function (centered)
				float grid(vec2 uv, float size) {
					// Calculate aspect ratio from UV derivatives
					vec2 ddx_uv = dFdx(uv);
					vec2 ddy_uv = dFdy(uv);
					float aspectRatio = length(ddx_uv) / length(ddy_uv);

					// Center UV coordinates (0.5, 0.5 becomes origin)
					vec2 centeredUv = uv - 0.5;

					// Adjust UV coordinates to maintain square grid
					vec2 adjustedUv;
					if (aspectRatio < 1.0) {
						adjustedUv = vec2(centeredUv.x, centeredUv.y * aspectRatio);
					} else {
						adjustedUv = vec2(centeredUv.x / aspectRatio, centeredUv.y);
					}

					// Scale by grid size
					adjustedUv *= size;

					// Calculate derivatives for adaptive line width
					vec2 grid_uv = fract(adjustedUv);
					vec2 ddx = dFdx(adjustedUv);
					vec2 ddy = dFdy(adjustedUv);

					// Adaptive line width based on screen resolution
					vec2 lineWidth = max(abs(ddx), abs(ddy)) * 0.75;

					// Create anti-aliased grid lines
					vec2 gridLines = abs(grid_uv - 0.5);
					vec2 grid_aa = smoothstep(0.5 - lineWidth, 0.5 - lineWidth * 0.5, gridLines);

					return max(grid_aa.x, grid_aa.y);
				}

				void main() {
					vec2 uv = gl_FragCoord.xy / resolution.xy;

					// Define the gradient colors
					vec3 topColor = vec3(0.012, 0.0, 0.188);
					vec3 bottomColor = vec3(0.008, 0.0, 0.106);

					// Create base gradient from top to bottom
					vec3 gradient = mix(bottomColor, topColor, uv.y);

					// Add smooth noise
					float noiseValue = noise(uv * 1.5 + time * 0.2 + 44.0);

					// Mix noise with gradient
					vec3 gradientWithEffects = gradient + (noiseValue - 0.5) * 0.2;

					// === GRID AND PLUSES ===
					vec2 gridUv = vUv;
					gridUv.y += uScroll;

					// Calculate grid lines (grid function handles centering)
					float gridPattern = grid(gridUv, gridSize);

					// Calculate aspect ratio for pluses
					vec2 ddx_uv = dFdx(gridUv);
					vec2 ddy_uv = dFdy(gridUv);
					float aspectRatio = length(ddx_uv) / length(ddy_uv);

					// Center UV coordinates (same as grid function)
					vec2 centeredUv = gridUv - 0.5;

					// Adjust UV coordinates to maintain square grid
					vec2 adjustedUv;
					if (aspectRatio < 1.0) {
						adjustedUv = vec2(centeredUv.x, centeredUv.y * aspectRatio);
					} else {
						adjustedUv = vec2(centeredUv.x / aspectRatio, centeredUv.y);
					}

					// Scale by grid size
					adjustedUv *= gridSize;

					// Create repeating 7x7 pattern for pluses
					vec2 patternUv = mod(adjustedUv, 7.0);
					vec2 patternCell = floor(patternUv);
					vec2 patternLocal = fract(patternUv);

					float plusPattern = 0.0;

					// Check all 4 corners of current cell in the pattern
					for (int y = 0; y <= 1; y++) {
						for (int x = 0; x <= 1; x++) {
							vec2 corner = patternCell + vec2(float(x), float(y));
							vec2 wrappedCorner = mod(corner, 7.0);

							// Place plus at (0,0) of each 7x7 tile
							if (abs(wrappedCorner.x) < 0.01 && abs(wrappedCorner.y) < 0.01) {
								vec2 cornerLocalPos = patternLocal - vec2(float(x), float(y));

								// Plus using SDF
								float plusSDF = sdPlus(cornerLocalPos, plusSize, plusThickness);
								float p = 1.0 - smoothstep(-0.001, 0.001, plusSDF);
								plusPattern = max(plusPattern, p);
							}
						}
					}

					// Apply grid and pluses to gradient
					vec3 colorWithGrid = gradientWithEffects + vec3(gridPattern * gridOpacity);
					vec3 colorWithPluses = colorWithGrid + vec3(plusPattern * plusOpacity);

					// Transition to solid bottom color based on progress
					vec3 color = mix(colorWithPluses, bottomColor + vec3(gridPattern * gridOpacity) + vec3(plusPattern * plusOpacity), progress);

					gl_FragColor = vec4(color, 1.0);
				}
			`
	}
}

export default GradientMaterial
