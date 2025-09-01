import * as THREE from 'three'

class PostProcessingPass {
	constructor() {
		this.material = null
		this.uniforms = {}
		this.material = this.getShaderMaterial()
	}

	getShaderMaterial() {
		return new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: this.getVertexShader(),
			fragmentShader: this.getFragmentShader(),
		})
	}

	getVertexShader() {
		return /* glsl */ `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`
		// Override in subclasses
	}

	getFragmentShader() {
		return /* glsl */ `
			uniform sampler2D tDiffuse;
			varying vec2 vUv;
			void main() {
				gl_FragColor = texture2D(tDiffuse, vUv);
			}
		`
		// Override in subclasses
	}

	update(deltaTime, inputTexture) {
		if (this.uniforms.tDiffuse) {
			this.uniforms.tDiffuse.value = inputTexture
		}
		if (this.uniforms.time) {
			this.uniforms.time.value += deltaTime
		}
		// Override in subclasses
	}

	resize(width, height) {
		if (this.uniforms.resolution) {
			this.uniforms.resolution.value.set(width, height)
		}
		// Override in subclasses
	}

	dispose() {
		this.material?.dispose()
	}
}

export default PostProcessingPass
