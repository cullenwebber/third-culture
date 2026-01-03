import * as THREE from 'three'

class NewsPostProcessor {
	constructor(scene, camera, renderer) {
		this.scene = scene
		this.camera = camera
		this.renderer = renderer
		this.pixelRatio = renderer.getPixelRatio()
		this.time = 0
		// Create render target at full resolution
		const size = renderer.getSize(new THREE.Vector2())
		const width = size.x * this.pixelRatio
		const height = size.y * this.pixelRatio

		this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			colorSpace: THREE.SRGBColorSpace,
			samples: 4, // MSAA anti-aliasing
		})

		// Create full-screen quad
		this.quadGeometry = new THREE.PlaneGeometry(2, 2)
		this.quadMaterial = new THREE.ShaderMaterial({
			uniforms: {
				tDiffuse: { value: this.renderTarget.texture },
				uTime: { value: 0 },
				uResolution: { value: new THREE.Vector2(width, height) },
			},
			vertexShader: /* glsl */ `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = vec4(position, 1.0);
				}
			`,
			fragmentShader: /* glsl */ `
				uniform sampler2D tDiffuse;
				uniform float uTime;
				uniform vec2 uResolution;
				varying vec2 vUv;

				// Simplex noise functions
				vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
				vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
				vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

				float snoise(vec2 v) {
					const vec4 C = vec4(0.211324865405187, 0.366025403784439,
						-0.577350269189626, 0.024390243902439);
					vec2 i = floor(v + dot(v, C.yy));
					vec2 x0 = v - i + dot(i, C.xx);
					vec2 i1;
					i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
					vec4 x12 = x0.xyxy + C.xxzz;
					x12.xy -= i1;
					i = mod289(i);
					vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
						+ i.x + vec3(0.0, i1.x, 1.0));
					vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
						dot(x12.zw, x12.zw)), 0.0);
					m = m * m;
					m = m * m;
					vec3 x = 2.0 * fract(p * C.www) - 1.0;
					vec3 h = abs(x) - 0.5;
					vec3 ox = floor(x + 0.5);
					vec3 a0 = x - ox;
					m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
					vec3 g;
					g.x = a0.x * x0.x + h.x * x0.y;
					g.yz = a0.yz * x12.xz + h.yz * x12.yw;
					return 130.0 * dot(m, g);
				}

				// Process UV for noise sampling
				vec2 processUV(vec2 uv, float scale) {
					vec2 newuv = uv;
					newuv.x += uTime * 0.004 * sign(uv.x - 0.5);
					newuv *= 50.0 * scale;
					return newuv;
				}

				// Fast 9-tap blur
				vec4 blur9(sampler2D tex, vec2 uv, float radius) {
					vec2 texelSize = 1.0 / uResolution * radius;
					vec4 color = texture2D(tex, uv) * 0.25;
					color += texture2D(tex, uv + vec2(-1.0, -1.0) * texelSize) * 0.0625;
					color += texture2D(tex, uv + vec2(0.0, -1.0) * texelSize) * 0.125;
					color += texture2D(tex, uv + vec2(1.0, -1.0) * texelSize) * 0.0625;
					color += texture2D(tex, uv + vec2(-1.0, 0.0) * texelSize) * 0.125;
					color += texture2D(tex, uv + vec2(1.0, 0.0) * texelSize) * 0.125;
					color += texture2D(tex, uv + vec2(-1.0, 1.0) * texelSize) * 0.0625;
					color += texture2D(tex, uv + vec2(0.0, 1.0) * texelSize) * 0.125;
					color += texture2D(tex, uv + vec2(1.0, 1.0) * texelSize) * 0.0625;
					return color;
				}

				void main() {
					vec2 uv = vUv;

					// Edge calculations
					float edge = smoothstep(0.32, 1.0, abs(uv.x - 0.5));
					float edge1 = 1.0 - smoothstep(0.2, 0.5, abs(uv.x - 0.5));

					// Noise UVs
					vec2 noiseUV = processUV(uv, 0.1);
					vec2 noiseUV1 = processUV(uv, 0.2);

					// Sample noise - add time for smooth animation
					float noise = snoise(noiseUV + vec2(uTime * 0.5, uTime * 0.3));
					float noise1 = snoise(noiseUV1 + vec2(uTime * 0.4, uTime * 0.2));

					// Direction from noise
					float angle = (noise + noise1 * 0.4) * 6.28318530718;
					vec2 direction = vec2(cos(angle), sin(angle));

					// Distorted UV
					vec2 distortedUV = uv + direction * noise * 0.2;

					// Mix between original and distorted based on edge
					vec2 finalUV = mix(uv, distortedUV, edge);

					// Chromatic aberration - RGB split based on edge
					float aberration = edge * 0.01;
					vec2 redUV = finalUV + vec2(aberration, 0.0);
					vec2 blueUV = finalUV - vec2(aberration, 0.0);

					vec4 sceneColor;
					sceneColor.r = texture2D(tDiffuse, redUV).r;
					sceneColor.g = texture2D(tDiffuse, finalUV).g;
					sceneColor.b = texture2D(tDiffuse, blueUV).b;
					sceneColor.a = 1.0;

					gl_FragColor = sceneColor;
				}
			`,
			depthTest: false,
			depthWrite: false,
		})

		this.quadMesh = new THREE.Mesh(this.quadGeometry, this.quadMaterial)
		this.quadScene = new THREE.Scene()
		this.quadScene.add(this.quadMesh)

		// Orthographic camera for full-screen quad
		this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
	}

	render() {
		// Update time uniform using performance.now()
		this.quadMaterial.uniforms.uTime.value = performance.now() * 0.001

		// Store current render target
		const currentRenderTarget = this.renderer.getRenderTarget()

		// Render scene to our render target
		this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.clear()
		this.renderer.render(this.scene, this.camera)

		// Render the quad with shader to screen
		this.renderer.setRenderTarget(currentRenderTarget)
		this.renderer.render(this.quadScene, this.quadCamera)
	}

	resize(width, height) {
		const scaledWidth = width * this.pixelRatio
		const scaledHeight = height * this.pixelRatio
		this.renderTarget.setSize(scaledWidth, scaledHeight)
		this.quadMaterial.uniforms.uResolution.value.set(scaledWidth, scaledHeight)
	}

	dispose() {
		this.renderTarget.dispose()
		this.quadGeometry.dispose()
		this.quadMaterial.dispose()
	}
}

export default NewsPostProcessor
