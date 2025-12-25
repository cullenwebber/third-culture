import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import BaseScene from '../base-scene.js'
import WebGLManager from '../context-manager.js'
import { getLenis } from '../../utils/smooth-scroll.js'

class HomeCapabilitiesScene extends BaseScene {
	setupScene() {
		this.scene.background = null
		this.modelScale = 2.5 // Adjust this to scale the model

		// Flow field parameters
		this.flowFieldInfluence = 0.1
		this.flowFieldStrength = 0.45
		this.flowFieldFrequency = 1.7

		this.scrollListener = null
	}

	async createObjects() {
		// Setup DRACO loader
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')

		// Load single model
		const loader = new GLTFLoader()
		loader.setDRACOLoader(dracoLoader)

		try {
			const gltf = await loader.loadAsync(
				'/wp-content/themes/startdigital/static/three/particle-logo.glb'
			)

			this.baseGeometry = {}
			this.baseGeometry.instance = gltf.scene.children[0].geometry
			this.baseGeometry.count =
				this.baseGeometry.instance.attributes.position.count

			// Setup GPGPU
			this.setupGPGPU()

			// Create particles
			this.setupParticles()

			dracoLoader.dispose()
		} catch (error) {
			console.error('Error loading model:', error)
		}
	}

	setupGPGPU() {
		const renderer = WebGLManager.instance.renderer
		if (!renderer) {
			console.error('Renderer not available')
			return
		}

		// Calculate texture size
		this.gpgpu = {}
		this.gpgpu.size = Math.ceil(Math.sqrt(this.baseGeometry.count))

		// Initialize GPU Computation
		this.gpgpu.computation = new GPUComputationRenderer(
			this.gpgpu.size,
			this.gpgpu.size,
			renderer
		)

		// Create base particles texture
		const baseParticlesTexture = this.gpgpu.computation.createTexture()

		// Fill with positions from geometry (with scale applied)
		for (let i = 0; i < this.baseGeometry.count; i++) {
			const i3 = i * 3
			const i4 = i * 4

			baseParticlesTexture.image.data[i4 + 0] =
				this.baseGeometry.instance.attributes.position.array[i3 + 0] *
				this.modelScale
			baseParticlesTexture.image.data[i4 + 1] =
				this.baseGeometry.instance.attributes.position.array[i3 + 1] *
				this.modelScale
			baseParticlesTexture.image.data[i4 + 2] =
				this.baseGeometry.instance.attributes.position.array[i3 + 2] *
				this.modelScale
			baseParticlesTexture.image.data[i4 + 3] = Math.random()
		}

		// Create GPGPU variable
		this.gpgpu.particlesVariable = this.gpgpu.computation.addVariable(
			'uParticles',
			this.getGPGPUShader(),
			baseParticlesTexture
		)

		this.gpgpu.computation.setVariableDependencies(
			this.gpgpu.particlesVariable,
			[this.gpgpu.particlesVariable]
		)

		// Add uniforms
		this.gpgpu.particlesVariable.material.uniforms.uTime = new THREE.Uniform(0)
		this.gpgpu.particlesVariable.material.uniforms.uDeltaTime =
			new THREE.Uniform(0)
		this.gpgpu.particlesVariable.material.uniforms.uBase = new THREE.Uniform(
			baseParticlesTexture
		)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldInfluence =
			new THREE.Uniform(this.flowFieldInfluence)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldStrength =
			new THREE.Uniform(this.flowFieldStrength)
		this.gpgpu.particlesVariable.material.uniforms.uFlowFieldFrequency =
			new THREE.Uniform(this.flowFieldFrequency)

		// Initialize
		const error = this.gpgpu.computation.init()
		if (error !== null) {
			console.error('GPUComputationRenderer error:', error)
		}

		// Compute once to initialize the render target
		this.gpgpu.computation.compute()
	}

	getGPGPUShader() {
		return /* glsl */ `
			uniform float uTime;
			uniform float uDeltaTime;
			uniform sampler2D uBase;
			uniform float uFlowFieldInfluence;
			uniform float uFlowFieldStrength;
			uniform float uFlowFieldFrequency;

			// Simplex 4D Noise by Ian McEwan, Ashima Arts
			vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
			float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
			vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
			float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

			vec4 grad4(float j, vec4 ip){
				const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
				vec4 p,s;

				p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
				p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
				s = vec4(lessThan(p, vec4(0.0)));
				p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

				return p;
			}

			float simplexNoise4d(vec4 v){
				const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
							0.309016994374947451); // (sqrt(5) - 1)/4   F4
				// First corner
				vec4 i  = floor(v + dot(v, C.yyyy) );
				vec4 x0 = v -   i + dot(i, C.xxxx);

				// Other corners
				vec4 i0;

				vec3 isX = step( x0.yzw, x0.xxx );
				vec3 isYZ = step( x0.zww, x0.yyz );
				i0.x = isX.x + isX.y + isX.z;
				i0.yzw = 1.0 - isX;

				i0.y += isYZ.x + isYZ.y;
				i0.zw += 1.0 - isYZ.xy;

				i0.z += isYZ.z;
				i0.w += 1.0 - isYZ.z;

				// i0 now contains the unique values 0,1,2,3 in each channel
				vec4 i3 = clamp( i0, 0.0, 1.0 );
				vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
				vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

				vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
				vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
				vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
				vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;

				// Permutations
				i = mod(i, 289.0);
				float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
				vec4 j1 = permute( permute( permute( permute (
						i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
					+ i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
					+ i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
					+ i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

				// Gradients
				vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

				vec4 p0 = grad4(j0,   ip);
				vec4 p1 = grad4(j1.x, ip);
				vec4 p2 = grad4(j1.y, ip);
				vec4 p3 = grad4(j1.z, ip);
				vec4 p4 = grad4(j1.w, ip);

				// Normalise gradients
				vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
				p0 *= norm.x;
				p1 *= norm.y;
				p2 *= norm.z;
				p3 *= norm.w;
				p4 *= taylorInvSqrt(dot(p4,p4));

				// Mix contributions from the five corners
				vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
				vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
				m0 = m0 * m0;
				m1 = m1 * m1;
				return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
							+ dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
			}

			void main() {
				float time = uTime * 0.2;
				vec2 uv = gl_FragCoord.xy / resolution.xy;
				vec4 particle = texture2D(uParticles, uv);
				vec4 base = texture2D(uBase, uv);

				if (particle.a >= 1.0) {
					particle.a = mod(particle.a, 1.0);
					particle.xyz = base.xyz;
				} else {
					// Constant strength for consistent movement
					float strength = 1.2;

					// Flow field
					vec3 flowField = vec3(
						simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + .0, uTime)),
						simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency * 1.2 + 1.0, uTime)),
						simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency * 1.0 + 2.0, uTime))
					);
					flowField = normalize(flowField);
					particle.xyz += flowField * uDeltaTime * strength * uFlowFieldStrength;

					// Decay
					particle.a += uDeltaTime * 1.4;
				}

				gl_FragColor = particle;
			}
		`
	}

	setupParticles() {
		this.particles = {}

		// Create UV array
		const uvArray = new Float32Array(this.baseGeometry.count * 2)
		const sizesArray = new Float32Array(this.baseGeometry.count)

		for (let y = 0; y < this.gpgpu.size; y++) {
			for (let x = 0; x < this.gpgpu.size; x++) {
				const i = y * this.gpgpu.size + x
				const i2 = i * 2

				if (i >= this.baseGeometry.count) break

				// UV with centering offset
				const uvX = (x + 0.5) / this.gpgpu.size
				const uvY = (y + 0.5) / this.gpgpu.size

				uvArray[i2 + 0] = uvX
				uvArray[i2 + 1] = uvY

				sizesArray[i] = Math.random()
			}
		}

		// Create geometry
		this.particles.geometry = new THREE.BufferGeometry()
		this.particles.geometry.setDrawRange(0, this.baseGeometry.count)
		this.particles.geometry.setAttribute(
			'aParticlesUv',
			new THREE.BufferAttribute(uvArray, 2)
		)
		this.particles.geometry.setAttribute(
			'aSize',
			new THREE.BufferAttribute(sizesArray, 1)
		)

		// Create material
		this.particles.material = new THREE.ShaderMaterial({
			vertexShader: /* glsl */ `
				uniform vec2 uResolution;
				uniform float uSize;
				uniform float uTime;
				uniform sampler2D uParticlesTexture;
				uniform sampler2D uBase;

				attribute vec2 aParticlesUv;
				attribute float aSize;

				varying vec3 vColor;

				vec3 hsl2rgb(vec3 hsl) {
					vec3 rgb = clamp(abs(mod(hsl.x*6.0 + vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);
					return hsl.z + hsl.y*(rgb-0.5)*(1.0 - abs(2.0*hsl.z - 1.0));
				}

				void main() {
					vec4 particle = texture2D(uParticlesTexture, aParticlesUv);
					vec4 baseParticle = texture2D(uBase, aParticlesUv);

					vec3 basePosition = baseParticle.xyz;
					vec3 currentPosition = particle.xyz;

					vec4 modelPosition = modelMatrix * vec4(currentPosition, 1.0);
					vec4 viewPosition = viewMatrix * modelPosition;
					vec4 projectedPosition = projectionMatrix * viewPosition;
					gl_Position = projectedPosition;

					// Size fade based on particle life
					float sizeIn = smoothstep(0.0, 0.8, particle.a);
					float sizeOut = 1.0 - smoothstep(0.2, 1.0, particle.a);
					float size = min(sizeIn, sizeOut);
					gl_PointSize = size * aSize * uSize * uResolution.y;
					gl_PointSize *= (1.0 / -viewPosition.z);

				}
			`,
			fragmentShader: /* glsl */ `
				

				void main() {
					float distanceToCenter = length(gl_PointCoord - 0.5);
					if(distanceToCenter > 0.5)
						discard;

					vec3 color = vec3(0.5,0.5,0.706);

					gl_FragColor = vec4(color, 1.0);

					#include <tonemapping_fragment>
					#include <colorspace_fragment>
				}
			`,
			uniforms: {
				uParticlesTexture: new THREE.Uniform(),
				uBase: new THREE.Uniform(),
				uSize: new THREE.Uniform(0.015),
				uTime: new THREE.Uniform(0),
				uResolution: new THREE.Uniform(
					new THREE.Vector2(
						window.innerWidth * window.devicePixelRatio,
						window.innerHeight * window.devicePixelRatio
					)
				),
			},
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		})

		// Create points
		this.particles.points = new THREE.Points(
			this.particles.geometry,
			this.particles.material
		)
		this.scene.add(this.particles.points)

		// Initialize particle texture with GPGPU output
		this.particles.material.uniforms.uParticlesTexture.value =
			this.gpgpu.computation.getCurrentRenderTarget(
				this.gpgpu.particlesVariable
			).texture

		// Set base texture for color calculation
		this.particles.material.uniforms.uBase.value =
			this.gpgpu.particlesVariable.material.uniforms.uBase.value
	}

	createScrollTriggers() {
		// Store listener reference for cleanup
		this.scrollListener = (e) => {
			// Rotate based on scroll velocity for smooth, physics-based rotation
			if (this.particles?.points) {
				this.particles.points.rotation.y += e.velocity * 0.002
			}
		}

		getLenis()?.on('scroll', this.scrollListener)
	}

	animate(deltaTime) {
		if (!this.isVisible || !this.gpgpu) return

		this.time += deltaTime

		// Update GPGPU uniforms
		this.gpgpu.particlesVariable.material.uniforms.uTime.value = this.time
		this.gpgpu.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime

		// Compute GPGPU
		this.gpgpu.computation.compute()

		// Update particle material uniforms
		this.particles.material.uniforms.uTime.value = this.time
		this.particles.material.uniforms.uParticlesTexture.value =
			this.gpgpu.computation.getCurrentRenderTarget(
				this.gpgpu.particlesVariable
			).texture
	}

	dispose() {
		// Remove scroll listener to prevent memory leaks
		if (this.scrollListener) {
			getLenis()?.off('scroll', this.scrollListener)
			this.scrollListener = null
		}

		// Call parent dispose for geometry/material cleanup
		super.dispose()
	}
}

export default HomeCapabilitiesScene
