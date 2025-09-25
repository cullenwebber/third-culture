import * as THREE from 'three'
import uvCoverVert from './shaders/uv-cover-vert'

class ImageMaterial {
	constructor(options = {}) {
		const defaults = {
			uTime: 0.0,
			uTexture: new THREE.Texture(),
			uTextureSize: new THREE.Vector2(0.0, 0.0),
			uQuadSize: new THREE.Vector2(0.0, 0.0),
			uViewportSize: new THREE.Vector2(window.innerWidth, window.innerHeight),
			uPerspectiveStrength: 1.0, // Control the strength of the perspective effect
			uViewportPosition: 0.0, // Element's position in viewport (0 = top, 1 = bottom)
		}

		this.options = { ...defaults, ...options }
		this.material = this.createMaterial()
	}

	createMaterial() {
		const vertexShader = /* glsl */ `
            float PI = 3.141592653589793;

            uniform float uTime;
			uniform float uScrollVelocity;
            uniform vec2 uTextureSize;
            uniform vec2 uQuadSize;
            uniform vec2 uViewportSize;
            uniform float uPerspectiveStrength;
            uniform float uViewportPosition;

            varying vec2 vUv; 
            varying vec2 vUvCover;
            varying vec2 vScreenPosition;

            ${uvCoverVert}
vec3 deformationCurve(vec3 position, vec2 uv) {
    // Calculate distance from bottom of viewport
    float imageTop = uViewportPosition - 0.5; 
    float imageBottom = uViewportPosition + 0.5; 
    
    // Map UV.y to actual viewport position
    float pixelViewportPosition = mix(imageBottom, imageTop, uv.y);
    
    // Distance from bottom of viewport - curve completes when bottom hits bottom
    float distanceFromBottom = max(0.0, pixelViewportPosition - 0.5);
    distanceFromBottom = smoothstep(0.0, 1.0, distanceFromBottom);
    
    // Exponential curve
    float exponent = 1.5;
    float curveFactor = pow(distanceFromBottom, exponent);
    
    float zDisplacement = curveFactor * uPerspectiveStrength * 0.5;
    float xPerspective = (uv.x - 0.5) * curveFactor * uPerspectiveStrength * 0.5;
    
    position.x += xPerspective;
    position.z += zDisplacement;
    
    return position;
}
            void main() {
                vUv = uv;
                vUvCover = getCoverUvVert(uv, uTextureSize, uQuadSize);

                vec3 deformedPosition = deformationCurve(position, vUvCover);
                
                // Pass screen position to fragment shader for additional effects
                vec4 screenPos = projectionMatrix * modelViewMatrix * vec4(deformedPosition, 1.0);
                vScreenPosition = screenPos.xy / screenPos.w;

                gl_Position = screenPos;
            }
        `

		const fragmentShader = /* glsl */ `
			uniform sampler2D uTexture;
			uniform float uTime;
			uniform float uViewportPosition;
			varying vec2 vUv;
			varying vec2 vUvCover;
			varying vec2 vScreenPosition;

			void main() {
				vec3 texture = texture2D(uTexture, vUvCover).rgb;
				
				// Use viewport position for depth-based darkening
				float depthDarkening = mix(1.0, 0.8, uViewportPosition);
				
				gl_FragColor = vec4(texture * depthDarkening, 1.0);
			}
		`

		return new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: this.options.uTime },
				uTexture: { value: this.options.uTexture },
				uTextureSize: { value: this.options.uTextureSize },
				uQuadSize: { value: this.options.uQuadSize },
				uScrollVelocity: { value: 0.0 },
				uPerspectiveStrength: { value: this.options.uPerspectiveStrength },
				uViewportPosition: { value: this.options.uViewportPosition },
			},
			vertexShader,
			fragmentShader,
			transparent: true,
		})
	}

	getMaterial() {
		return this.material
	}

	updateTime(time) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uTime
		) {
			this.material.uniforms.uTime.value = time
		}
	}

	setScrollVelocity(value) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uScrollVelocity
		) {
			this.material.uniforms.uScrollVelocity.value = value
		}
	}

	setPerspectiveStrength(value) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uPerspectiveStrength
		) {
			this.material.uniforms.uPerspectiveStrength.value = value
		}
	}

	setViewportPosition(value) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uViewportPosition
		) {
			this.material.uniforms.uViewportPosition.value = value
		}
	}

	updateViewportSize(width, height) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uViewportSize
		) {
			this.material.uniforms.uViewportSize.value.set(width, height)
		}
	}
}

export default ImageMaterial
