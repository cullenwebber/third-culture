import * as THREE from 'three'
import perlin3dNoise from './shaders/perlin3dNoise'
import concreteFragment from './shaders/concrete-fragment'

class OverlayShaderMaterial {
	constructor(options = {}) {
		const defaults = {
			color: new THREE.Color(0xffffff),
			lightPosition: new THREE.Vector3(0.0, 0.25, 2.0),
			mousePosition: new THREE.Vector2(0.0, 0.0),
			mouseVelocity: 0.0,
			time: 0.0,
			aspectRatio: window.innerWidth / window.innerHeight,
			fadeHeight: 0.075, // 1/8 of the height for bottom fade zone
			topFadeHeight: 0.075, // 1/8 of the height for top fade zone
		}
		this.targetMousePosition = new THREE.Vector2(0.0, 0.0)
		this.currentMousePosition = this.targetMousePosition.clone()

		this.targetMouseVelocity = 0.0
		this.currentMouseVelocity = 0.0
		this.isAnimating = false

		this.options = { ...defaults, ...options }
		this.material = this.createMaterial()
		this.material.needsUpdate = true
		this.material.transparent = true
	}

	createMaterial() {
		const vertexShader = /* glsl */ `
       
           varying vec2 vUv;
   		varying vec3 vNormal;
   		varying vec3 vPosition;
   		varying vec3 vWorldPosition;

           void main()
           {
               vUv = uv;
   			vNormal = normalize(normalMatrix * normal);
   			vPosition = position;
   			vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

               gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
           }
       `
		const fragmentShader = /* glsl */ `
       
           uniform vec3 color;
           uniform vec3 lightPosition;
           uniform vec2 mousePosition;
           uniform float mouseVelocity;
           uniform float time;
           uniform float aspectRatio;
           uniform float fadeHeight;
           uniform float topFadeHeight;

           varying vec2 vUv;
   		varying vec3 vNormal;
   		varying vec3 vPosition;
   		varying vec3 vWorldPosition;

           // import perlin noise function
           ${perlin3dNoise}

           // Function to create concrete
   		${concreteFragment}

           void main()
           {
                   vec2 displacedUv = vUv + cnoise(vec3(vUv * 11.0, time * 0.2));
                   float strength = cnoise(vec3(displacedUv * 0.75, time * 0.5 ));

                   vec2 correctedUv = vec2(vUv.x * aspectRatio, vUv.y);

                   vec2 correctedMouse = vec2(mousePosition.x * aspectRatio, mousePosition.y);

                  vec2 swishCenter = vec2(
                    1.0 + sin(time * 0.25) * 1.0,
                    abs(sin(time * 0.25)) * 0.25
                );
                   float swishGradient = distance(correctedUv, swishCenter) * 10.5 - 6.5 * abs(sin(time * 0.35));

				   vec2 swishCenter2 = vec2(
						    0.5 + sin(time * 0.15) * cos(time * 0.3) * 0.7,
    						abs(sin(time * 0.15))
					);
					float swishGradient2 = distance(correctedUv, swishCenter2) * 10.0 - 6.5 * abs(cos(time * 0.28));

                   float radialFactor = clamp(mouseVelocity, 0.0, 1.0);
                   float radialGradient = distance(correctedUv, correctedMouse) * 10.5 - 4.5 * (0.5  + radialFactor * 0.5);
                   
                   swishGradient = clamp(swishGradient, -3.0, 1.0);
                   swishGradient2 = clamp(swishGradient2, -3.0, 1.0);
                	radialGradient = clamp(radialGradient, -3.0, 1.0);

                    strength += radialGradient + swishGradient + swishGradient2;
                
                   strength = clamp(strength, 0.0, 1.0);

                   vec3 concreteColor = generateConcreteTexture(color, vUv, vec2(0.0));
   			
                   vec3 lightDir = normalize(lightPosition);
                   float NdotL = max(dot(vNormal, lightDir), 0.0);
                   
                   vec3 ambient = concreteColor * 0.23;
                   vec3 diffuse = concreteColor * NdotL * 0.6;

                   float edge = abs(dFdx(strength)) + abs(dFdy(strength));
                   edge = smoothstep(0.0, 0.07, edge);

					float dispersionAmount = edge * 1.0;

					vec2 uvR = vUv + vec2(dispersionAmount, 0.0);
					vec2 uvG = vUv;
					vec2 uvB = vUv - vec2(dispersionAmount, 0.0);

					// Calculate strength for each channel
					float strengthR = cnoise(vec3(uvR + cnoise(vec3(uvR * 2.0, time * 0.5)), 0.0));
					float strengthG = strength;
					float strengthB = cnoise(vec3(uvB + cnoise(vec3(uvB * 2.0, time * 0.5)), 0.0));

					// Apply gradients
					strengthR += radialGradient + swishGradient + swishGradient2;
					strengthB += radialGradient + swishGradient + swishGradient2;

					strengthR = clamp(strengthR, 0.0, 1.0);
					strengthB = clamp(strengthB, 0.0, 1.0);

					// Create prismatic colors
					vec3 prismaticEdge = vec3(
						strengthR * 2.0,
						strengthG,
						strengthB * 1.3
					);

					// Add spectral highlights
					float spectral = sin(vUv.x * 50.0 + time) * 0.5 + 0.5;
					prismaticEdge += vec3(spectral * 0.1, spectral * 0.1, spectral * 0.3) * edge;

					vec3 finalColor = mix(ambient + diffuse, prismaticEdge, edge);

					// Calculate alpha fade from bottom and top
					// Bottom fade: vUv.y goes from 0 (bottom) to 1 (top)
					// We want alpha 0 at bottom, alpha 1 at fadeHeight
					float bottomAlphaFade = smoothstep(0.0, fadeHeight, vUv.y);
					
					// Top fade: we want alpha 1 at (1.0 - topFadeHeight), alpha 0 at 1.0 (top)
					float topAlphaFade = smoothstep(1.0, 1.0 - topFadeHeight, vUv.y);
					
					// Combine both fades by multiplying them
					float alphaFade = bottomAlphaFade * topAlphaFade;
					
					// Multiply the existing alpha by the fade
					float finalAlpha = strength * alphaFade;

					gl_FragColor = vec4(finalColor, finalAlpha);
           }
       `

		return new THREE.ShaderMaterial({
			uniforms: {
				color: { value: this.options.color },
				lightPosition: { value: this.options.lightPosition },
				mousePosition: { value: this.options.mousePosition },
				mouseVelocity: { value: this.options.mouseVelocity },
				time: { value: this.options.time },
				aspectRatio: { value: this.options.aspectRatio },
				fadeHeight: { value: this.options.fadeHeight },
				topFadeHeight: { value: this.options.topFadeHeight },
			},
			vertexShader,
			fragmentShader,
		})
	}

	getMaterial() {
		return this.material
	}

	updateTime(value) {
		this.material.uniforms.time.value = value
	}

	updateMousePosition(targetMousePosition) {
		this.targetMousePosition.copy(targetMousePosition)
		if (!this.isAnimating) {
			this.isAnimating = true
			this.animate()
		}
	}

	updateMouseVelocity(value) {
		this.targetMouseVelocity = value
		if (!this.isAnimating) {
			this.isAnimating = true
			this.animate()
		}
	}

	updateAspectRatio(aspectRatio) {
		this.material.uniforms.aspectRatio.value = aspectRatio
	}

	// Method to update the fade heights
	updateFadeHeight(fadeHeight) {
		this.material.uniforms.fadeHeight.value = fadeHeight
	}

	updateTopFadeHeight(topFadeHeight) {
		this.material.uniforms.topFadeHeight.value = topFadeHeight
	}

	animate() {
		this.currentMousePosition.lerp(this.targetMousePosition, 0.1)
		this.material.uniforms.mousePosition.value.copy(this.currentMousePosition)

		this.currentMouseVelocity +=
			(this.targetMouseVelocity - this.currentMouseVelocity) * 0.01
		this.material.uniforms.mouseVelocity.value = this.currentMouseVelocity

		const positionDistance = this.currentMousePosition.distanceTo(
			this.targetMousePosition
		)
		const velocityDistance = Math.abs(
			this.currentMouseVelocity - this.targetMouseVelocity
		)

		if (positionDistance > 0.001 || velocityDistance > 0.001) {
			requestAnimationFrame(() => this.animate())
		} else {
			this.currentMousePosition.copy(this.targetMousePosition)
			this.material.uniforms.mousePosition.value.copy(this.currentMousePosition)
			this.currentMouseVelocity = this.targetMouseVelocity
			this.material.uniforms.mouseVelocity.value = this.currentMouseVelocity
			this.isAnimating = false
		}
	}
}

export default OverlayShaderMaterial
