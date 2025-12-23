import * as THREE from 'three'

class GradientMaterial extends THREE.ShaderMaterial {
	constructor() {
		super()
		this.uniforms = {
			time: { value: 0 },
			resolution: { value: new THREE.Vector2() },
			progress: { value: 0 },
		}

		this.vertexShader = this.getVertexShader()
		this.fragmentShader = this.getFragmentShader()

		// Render behind everything else
		this.depthWrite = false
		this.depthTest = true
	}

	getVertexShader() {
		return /* glsl */ `
				void main() {
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`
	}

	getFragmentShader() {
		return /* glsl */ `
				uniform float time;
				uniform vec2 resolution;
				uniform float progress;

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

				void main() {
					vec2 uv = gl_FragCoord.xy / resolution.xy;

					// Define the gradient colors (0x030030 to 0x02001B)
					vec3 topColor = vec3(3.0/255.0, 0.0, 48.0/255.0);
					vec3 bottomColor = vec3(2.0/255.0, 0.0, 20.0/255.0);

					// Create base gradient from top to bottom
					vec3 gradient = mix(bottomColor, topColor, uv.y);

					// Add smooth noise
					float noiseValue = noise(uv * 1.5 + time * 0.2 + 44.0);

					// Add film grain (from DotScreenShader)
					vec2 uvrandom = uv;
					uvrandom.y *= random(vec2(uvrandom.y, time));
					float grain = random(uvrandom) * 0.1;

					// Mix noise and grain with gradient
					vec3 gradientWithEffects = gradient + (noiseValue - 0.5) * 0.2 + grain;

					// Transition to solid bottom color based on progress
					vec3 color = mix(gradientWithEffects, (bottomColor + grain), progress);

					gl_FragColor = vec4(color, 1.0);
				}
			`
	}
}

export default GradientMaterial
