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
			uPerspectiveStrength: 1.0,
			uViewportPosition: 0.0,
			uHover: 0.0, // Add hover uniform
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
                float imageTop = uViewportPosition - 0.5; 
                float imageBottom = uViewportPosition + 0.5; 
                
                float pixelViewportPosition = mix(imageBottom, imageTop, uv.y);
                float distanceFromBottom = max(0.0, pixelViewportPosition - 0.5);
                distanceFromBottom = smoothstep(0.0, 1.0, distanceFromBottom);
                
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
                
                vec4 screenPos = projectionMatrix * modelViewMatrix * vec4(deformedPosition, 1.0);
                vScreenPosition = screenPos.xy / screenPos.w;

                gl_Position = screenPos;
            }
        `

		const fragmentShader = /* glsl */ `
			precision highp float;
			
			uniform sampler2D uTexture;
			uniform float uTime;
			uniform float uViewportPosition;
			uniform float uHover;
			uniform vec2 uTextureSize;
			uniform vec2 uQuadSize;
			
			varying vec2 vUv;
			varying vec2 vUvCover;
			varying vec2 vScreenPosition;

			float exponentialInOut(float t) {
				return t == 0.0 || t == 1.0 
					? t 
					: t < 0.5
						? 0.5 * pow(2.0, (20.0 * t) - 10.0)
						: -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
			}

			void main() {
				vec2 uv = vUvCover;
				
				// Hover effect
				float zoomLevel = 0.1;
				float hoverLevel = exponentialInOut(min(1.0, (distance(vec2(0.5), uv) * uHover) + uHover));
				
				// Apply zoom
				uv *= 1.0 - zoomLevel * hoverLevel;
				uv += zoomLevel / 2.0 * hoverLevel;
				uv = clamp(uv, 0.0, 1.0);
				
				// Sample texture
				vec3 textureColor = texture2D(uTexture, uv).rgb;
				
				// Apply hover distortion effects
				if(hoverLevel > 0.0) {
					hoverLevel = 1.0 - abs(hoverLevel - 0.5) * 2.0;
					
					// Pixel displace
					uv.y += textureColor.r * hoverLevel * 0.05;
					textureColor = texture2D(uTexture, uv).rgb;
					
					// // RGB shift
					// textureColor.r = texture2D(uTexture, uv + (hoverLevel) * 0.01).r;
					// textureColor.g = texture2D(uTexture, uv - (hoverLevel) * 0.01).g;
				}
				
				// Use viewport position for depth-based darkening
				float depthDarkening = mix(1.0, 0.8, uViewportPosition);
				
				gl_FragColor = vec4(textureColor * depthDarkening, 1.0);
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
				uHover: { value: this.options.uHover },
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

	setHover(value) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uHover
		) {
			this.material.uniforms.uHover.value = value
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
