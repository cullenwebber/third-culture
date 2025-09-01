import * as THREE from 'three'
import uvCoverVert from './shaders/uv-cover-vert'

class ImageMaterial {
	constructor(options = {}) {
		const defaults = {
			uScrollVelocity: 0.0,
			uTexture: new THREE.Texture(),
			uTextureSize: new THREE.Vector2(0.0, 0.0),
			uQuadSize: new THREE.Vector2(0.0, 0.0),
		}

		this.options = { ...defaults, ...options }
		this.material = this.createMaterial()
	}

	createMaterial() {
		const vertexShader = /* glsl */ `

            float PI = 3.141592653589793;

            uniform float uScrollVelocity;
            uniform vec2 uTextureSize;
            uniform vec2 uQuadSize;

            varying vec2 vUv; 
            varying vec2 vUvCover;

            ${uvCoverVert}

            vec3 deformationCurve(vec3 position, vec2 uv) {
                position.y = position.y - (sin(uv.x * PI) * uScrollVelocity * -0.01);
                return position;
            }

            void main() {
                vUv = uv;
                vUvCover = getCoverUvVert(uv, uTextureSize, uQuadSize);

                vec3 deformedPosition = deformationCurve(position, vUvCover);

                gl_Position = projectionMatrix * modelViewMatrix * vec4(deformedPosition, 1.0);
            }
        `
		const fragmentShader = /* glsl */ `
        
            uniform sampler2D uTexture;

            varying vec2 vUv; // 0 (left) 0 (bottom) - 1 (right) 1 (top)
            varying vec2 vUvCover;

            void main() {
                vec3 texture = vec3(texture(uTexture, vUvCover));
                gl_FragColor = vec4(texture, 1.0);
            }
        `

		return new THREE.ShaderMaterial({
			uniforms: {
				uScrollVelocity: { value: this.options.uScrollVelocity },
				uTexture: { value: this.options.uTexture },
				uTextureSize: { value: this.options.uTextureSize },
				uQuadSize: { value: this.options.uQuadSize },
			},
			vertexShader,
			fragmentShader,
		})
	}

	getMaterial() {
		return this.material
	}

	setScrollVelocity(value) {
		this.material.uniforms.uScrollVelocity.value = value
	}
}

export default ImageMaterial
