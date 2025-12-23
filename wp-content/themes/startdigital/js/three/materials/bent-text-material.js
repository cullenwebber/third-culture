import * as THREE from 'three'

class BentTextMaterial extends THREE.ShaderMaterial {
	constructor(options = {}) {
		// Extract uniform values from options
		const { uColor, uScrollVelocity, uRadius } = options

		super()

		this.uniforms = {
			uTime: { value: 0 },
			uColor: { value: uColor ?? new THREE.Color('#ffffff') },
			uScrollVelocity: { value: uScrollVelocity ?? 0 },
			uRadius: { value: uRadius ?? 1 },
		}

		this.vertexShader = this.getVertexShader()
		this.fragmentShader = this.getFragmentShader()
	}

	getVertexShader() {
		return /* glsl */ `

            float PI = 3.141592653589793;

            varying vec2 vUv;
            uniform float uTime;
            uniform float uRadius;
            uniform float uScrollVelocity;

            vec3 deformationCurve(vec3 position) {

				float normalizedX = position.x; // Use position directly for curve calculation

				// Calculate angle based on horizontal position
				float angle = normalizedX;

				// Apply cylindrical curve
				position.z = position.z + (cos(angle) - 1.0) * uRadius;

				// Optional: slight Y wave based on scroll velocity
				position.y = position.y - sin(normalizedX * PI) * uScrollVelocity * -0.015;

				return position;
			}

            void main() {
                vUv = uv;

                vec3 deformedPosition = deformationCurve(position);

                gl_Position = projectionMatrix * modelViewMatrix * vec4(deformedPosition, 1.0);
            }
        `
	}

	getFragmentShader() {
		return /* glsl */ `
            uniform sampler2D uTexture;
            varying vec2 vUv;
            uniform vec3 uColor;
            
            void main()
            {
                gl_FragColor = vec4(uColor, 1.0);
            }
        `
	}
}

export default BentTextMaterial
