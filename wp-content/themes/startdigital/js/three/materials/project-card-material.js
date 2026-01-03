import * as THREE from 'three'

class ProjectCardMaterial extends THREE.ShaderMaterial {
	constructor(options = {}) {
		super()

		this.uniforms = {
			uTime: { value: 0 },
			uTexture: { value: options.texture || null },
			uMouse: { value: new THREE.Vector2(0.5, 0.5) },
			uMouseIntro: { value: new THREE.Vector2(0.5, 0.5) },
			uIntro: { value: 1.0 },
			uRadius: { value: options.radius || 0.3 },
			uStrength: { value: options.strength || 0.5 },
			uBulge: { value: 0.0 }, // 0 = no effect, 1 = full effect
		}

		this.vertexShader = this.getVertexShader()
		this.fragmentShader = this.getFragmentShader()

		this.side = THREE.DoubleSide
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
			precision highp float;

			uniform float uTime;
			uniform sampler2D uTexture;
			uniform vec2 uMouse;
			uniform vec2 uMouseIntro;
			uniform float uIntro;
			uniform float uRadius;
			uniform float uStrength;
			uniform float uBulge;

			varying vec2 vUv;

			vec2 bulge(vec2 uv, vec2 center) {
				uv -= center; // center to mouse

				float dist = length(uv) / uRadius; // amount of distortion based on mouse pos
				float distPow = pow(dist, 4.); // exponential as you are far from the mouse
				float strengthAmount = uStrength / (1.0 + distPow); // strength

				uv *= (1. - uBulge) + uBulge * strengthAmount; // use uBulge to smoothly reset/add effect

				uv += center; // reset pos

				return uv;
			}

			void main() {
				// Add bulge effect based on mouse
				vec2 mixMouse = mix(uMouseIntro, uMouse, uIntro);
				vec2 bulgeUV = bulge(vUv, mixMouse);

				vec4 tex = texture2D(uTexture, bulgeUV);

				gl_FragColor.rgb = tex.rgb;
				gl_FragColor.a = 1.0;
			}
		`
	}
}

export default ProjectCardMaterial
