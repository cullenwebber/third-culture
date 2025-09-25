import * as THREE from 'three'
import uvCoverVert from './shaders/uv-cover-vert'

class ImageMaterial {
	constructor(options = {}) {
		const defaults = {
			uTime: 0.0,
			uRadius: 1.7, // Control the curvature radius
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

            uniform float uTime;
			uniform float uScrollVelocity;
            uniform float uRadius;
            uniform vec2 uTextureSize;
            uniform vec2 uQuadSize;

            varying vec2 vUv; 
            varying vec2 vUvCover;

            ${uvCoverVert}

          vec3 deformationCurve(vec3 position, vec2 uv) {
				
				
				
				position.y = position.y - sin(uv.x * PI) * uScrollVelocity * -0.015;
			
				
				float angle = (uv.y - 0.5);
				position.z = position.z + (cos(angle) - 1.0) * uRadius;
				
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
    uniform float uTime;
    float PI = 3.141592653589793;
    varying vec2 vUv;
    varying vec2 vUvCover;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
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

    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 0.0;
        
        for (int i = 0; i < 4; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

		void main() {
			vec3 texture = vec3(texture(uTexture, vUvCover));
			
			float alpha = sin(vUv.y * PI);
			float noiseValue = fbm(vUv * 7.0 + uTime * 0.15) * 0.5 - 0.4;
			alpha += noiseValue;
			alpha = clamp(alpha, 0.0, 1.0);
			
			gl_FragColor = vec4(texture, alpha);
		}
`

		return new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: this.options.uTime },
				uWaveAmplitude: { value: this.options.uWaveAmplitude },
				uWaveFrequency: { value: this.options.uWaveFrequency },
				uRadius: { value: this.options.uRadius },
				uTexture: { value: this.options.uTexture },
				uTextureSize: { value: this.options.uTextureSize },
				uQuadSize: { value: this.options.uQuadSize },
				uScrollVelocity: { value: 0.0 },
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

	setWaveAmplitude(value) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uWaveAmplitude
		) {
			this.material.uniforms.uWaveAmplitude.value = value
		}
	}

	setWaveFrequency(value) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uWaveFrequency
		) {
			this.material.uniforms.uWaveFrequency.value = value
		}
	}

	setRadius(value) {
		if (
			this.material &&
			this.material.uniforms &&
			this.material.uniforms.uRadius
		) {
			this.material.uniforms.uRadius.value = value
		}
	}
}

export default ImageMaterial
