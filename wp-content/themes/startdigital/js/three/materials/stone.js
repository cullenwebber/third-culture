import * as THREE from 'three'

class StoneMaterial {
	constructor(options = {}) {
		const defaults = {
			baseColor: 0x909090,
			darkColor: 0x606060,
			lightColor: 0xa0a0a0,
			roughness: 0.9,
			normalScale: 0.5,
			detailScale: 20.0,
			largeScale: 1.0,
		}

		this.options = { ...defaults, ...options }
		this.material = this.createMaterial()
		this.material.needsUpdate = true
	}

	createMaterial() {
		const vertexShader = /* glsl */ `
			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying vec3 vViewPosition;

			void main() {
				vUv = uv;
				vNormal = normalize(normalMatrix * normal);
				vPosition = position; // Use local object position
				
				vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
				vViewPosition = -mvPosition.xyz;
				
				gl_Position = projectionMatrix * mvPosition;
			}
		`

		const fragmentShader = /* glsl */ `
			#include <common>
			#include <lights_pars_begin>
			#include <shadowmap_pars_fragment>
			#include <fog_pars_fragment>

			uniform vec3 baseColor;
			uniform vec3 darkColor;
			uniform vec3 lightColor;
			uniform float roughness;
			uniform float normalScale;
			uniform float detailScale;
			uniform float largeScale;

			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			varying vec3 vViewPosition;

			// Simple noise function
			float hash(vec3 p) {
				p = fract(p * 0.3183099 + .1);
				p *= 17.0;
				return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
			}

			float noise(vec3 x) {
				vec3 i = floor(x);
				vec3 f = fract(x);
				f = f * f * (3.0 - 2.0 * f);
				
				return mix(mix(mix(hash(i + vec3(0,0,0)), 
								   hash(i + vec3(1,0,0)), f.x),
							   mix(hash(i + vec3(0,1,0)), 
								   hash(i + vec3(1,1,0)), f.x), f.y),
						   mix(mix(hash(i + vec3(0,0,1)), 
								   hash(i + vec3(1,0,1)), f.x),
							   mix(hash(i + vec3(0,1,1)), 
								   hash(i + vec3(1,1,1)), f.x), f.y), f.z);
			}

			// Fractal noise
			float fbm(vec3 p) {
				float value = 0.0;
				float amplitude = 0.5;
				
				for(int i = 0; i < 4; i++) {
					value += amplitude * noise(p);
					p *= 2.0;
					amplitude *= 0.5;
				}
				
				return value;
			}

			void main() {
				// Stone texture generation using local object position
				vec3 pos = vPosition;
				
				float largePattern = fbm(pos * largeScale);
				float detailPattern = fbm(pos * detailScale);
				float fineDetail = fbm(pos * detailScale * 4.0);
				
				// Color variation
				float colorMix = (largePattern + detailPattern * 0.3) * 0.5 + 0.5;
				colorMix = smoothstep(0.55, 0.8, colorMix);
				
				vec3 stoneColor = mix(darkColor, lightColor, colorMix);
				stoneColor = mix(stoneColor, baseColor, 0.5);
				
				// Add fine detail variation
				stoneColor += fineDetail * 0.1;
				
				// Simple lighting calculation
				vec3 normal = normalize(vNormal);
				vec3 viewDir = normalize(vViewPosition);
				
				// Basic diffuse lighting
				vec3 lightColor = vec3(1.0);
				float NdotL = max(dot(normal, normalize(vec3(1.0, 1.0, 1.0))), 0.0);
				
				vec3 diffuse = stoneColor * lightColor * NdotL;
				vec3 ambient = stoneColor * 0.55;
				
				// Simple specular
				vec3 halfwayDir = normalize(normalize(vec3(1.0, 1.0, 1.0)) + viewDir);
				float spec = pow(max(dot(normal, halfwayDir), 0.0), 64.0);
				vec3 specular = vec3(0.1) * spec;
				
				vec3 color = ambient + diffuse + specular;
				
				// Ambient occlusion in crevices
				float ao = 1.0 - smoothstep(0.0, 0.4, abs(detailPattern)) * 0.3;
				color *= ao;
				
				gl_FragColor = vec4(color, 1.0);
				
				#include <fog_fragment>
			}
		`

		return new THREE.ShaderMaterial({
			uniforms: {
				...THREE.UniformsLib.lights,
				...THREE.UniformsLib.fog,
				baseColor: { value: new THREE.Color(this.options.baseColor) },
				darkColor: { value: new THREE.Color(this.options.darkColor) },
				lightColor: { value: new THREE.Color(this.options.lightColor) },
				roughness: { value: this.options.roughness },
				normalScale: { value: this.options.normalScale },
				detailScale: { value: this.options.detailScale },
				largeScale: { value: this.options.largeScale },
			},
			vertexShader,
			fragmentShader,
			lights: true,
			fog: true,
		})
	}

	getMaterial() {
		return this.material
	}

	dispose() {
		this.material.dispose()
	}
}

export default StoneMaterial
