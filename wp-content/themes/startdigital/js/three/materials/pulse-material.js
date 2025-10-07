import * as THREE from 'three'

class PulseMaterial {
	constructor(options = {}) {
		const defaults = {
			color: new THREE.Color(0.4, 0.4, 0.4),
			scanSpeed: 0.25,
			scanWidth: 0.005,
			glowIntensity: 0.3,
			trailLength: 0.5,
		}

		this.options = { ...defaults, ...options }
		this.material = this.createMaterial()
	}

	createMaterial() {
		const vertexShader = /* glsl */ `
			varying vec3 vPosition;
			varying vec3 vNormal;
			varying vec3 vViewPosition;
			
			void main() {
				vPosition = position;
				vNormal = normalize(normalMatrix * normal);
				
				vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
				vViewPosition = -mvPosition.xyz;
				
				gl_Position = projectionMatrix * mvPosition;
			}
		`

		const fragmentShader = /* glsl */ `
			uniform vec3 color;
			uniform float time;
			uniform float scanSpeed;
			uniform float scanWidth;
			uniform float glowIntensity;
			uniform float fresnelPower;
			uniform float trailLength;
			
			varying vec3 vPosition;
			varying vec3 vNormal;
			varying vec3 vViewPosition;
			
			void main() {
				// Fresnel effect for edge glow
				vec3 viewDir = normalize(vViewPosition);
				float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), fresnelPower);
				
				// Vertical scan line with trailing glow
				float scanPos = fract(time * scanSpeed) * 2.0 - 1.0;
				float scanDist = vPosition.y - scanPos;
				
				// Main scan line
				float scan = smoothstep(scanWidth, 0.0, abs(scanDist));
				
				// Trailing glow effect
				float trail = smoothstep(trailLength, 0.0, -scanDist) * 
				              step(scanDist, 0.0); // Only behind the scan
				

				// Combine effects
				float scanEffect = scan * glowIntensity;
				float trailEffect = trail;
				
				// Color variations along scan
				vec3 scanColor = color * (1.0 + scan * 2.0);
				vec3 trailColor = color * 0.6;
				
				vec3 finalColor = scanColor * scanEffect + 
				                  trailColor * trailEffect;
				
				// Alpha combines all effects
				float alpha = scanEffect + trailEffect;
				alpha = clamp(alpha, 0.0, 1.0);
				
				gl_FragColor = vec4(finalColor, alpha);
			}
		`

		return new THREE.ShaderMaterial({
			uniforms: {
				color: { value: this.options.color },
				time: { value: 0.0 },
				scanSpeed: { value: this.options.scanSpeed },
				scanWidth: { value: this.options.scanWidth },
				glowIntensity: { value: this.options.glowIntensity },
				fresnelPower: { value: this.options.fresnelPower },
				trailLength: { value: this.options.trailLength },
			},
			vertexShader,
			fragmentShader,
			transparent: true,
			side: THREE.FrontSide,
		})
	}

	getMaterial() {
		return this.material
	}

	update(time) {
		this.material.uniforms.time.value = time
	}

	dispose() {
		this.material.dispose()
	}
}

export default PulseMaterial
