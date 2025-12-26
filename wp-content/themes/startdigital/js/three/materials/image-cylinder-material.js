import uvCoverVert from './shaders/uv-cover-vert'
import * as THREE from 'three'

class ImageCylinderMaterial extends THREE.ShaderMaterial {
	constructor(options = {}) {
		// Extract uniform values from options
		const {
			uTexture,
			uTime,
			uResolution,
			uScrollVelocity,
			uRadius,
			uTextureSize,
			uQuadSize,
			uBackColor,
			...materialOptions
		} = options

		// Set up uniforms
		const uniforms = {
			uTime: { value: uTime ?? 0 },
			uResolution: { value: uResolution ?? new THREE.Vector2() },
			uTexture: { value: uTexture ?? null },
			uScrollVelocity: { value: uScrollVelocity ?? 0 },
			uRadius: { value: uRadius ?? 1 },
			uTextureSize: { value: uTextureSize ?? new THREE.Vector2(1, 1) },
			uQuadSize: { value: uQuadSize ?? new THREE.Vector2(1, 1) },
			uBackColor: { value: uBackColor ?? new THREE.Color('#18154E') },
			// Bulge hover effect
			uMouse: { value: new THREE.Vector2(0.5, 0.5) },
			uMouseIntro: { value: new THREE.Vector2(0.5, 0.5) },
			uIntro: { value: 1.0 },
			uBulgeRadius: { value: 0.9 },
			uBulgeStrength: { value: 1.0 },
			uBulge: { value: 0.0 }, // 0 = no effect, 1 = full effect
		}

		// Call parent constructor with material options
		super({
			uniforms,
			vertexShader: ImageCylinderMaterial.getVertexShader(),
			fragmentShader: ImageCylinderMaterial.getFragmentShader(),
			...materialOptions,
		})

		this.transparent = true
	}

	static getVertexShader() {
		return /* glsl */ `
            float PI = 3.141592653589793;
            varying vec2 vUv; 
            varying vec2 vUvCover;
            uniform float uTime;
            uniform float uScrollVelocity;
            uniform float uRadius;
            uniform vec2 uTextureSize;
            uniform vec2 uQuadSize;

            ${uvCoverVert}

            vec3 deformationCurve(vec3 position, vec2 uv) {

				position.y = position.y - sin(uv.x * PI) * uScrollVelocity * -0.015;

				float angle = (uv.x - 0.5);
				
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
	}

	static getFragmentShader() {
		return /* glsl */ `
            uniform sampler2D uTexture;
            uniform vec3 uBackColor;
            uniform vec2 uMouse;
            uniform vec2 uMouseIntro;
            uniform float uIntro;
            uniform float uBulgeRadius;
            uniform float uBulgeStrength;
            uniform float uBulge;
            varying vec2 vUv;
            varying vec2 vUvCover;

            // Bulge effect
            vec2 bulge(vec2 uv, vec2 center) {
                uv -= center; // center to mouse

                float dist = length(uv) / uBulgeRadius; // amount of distortion based on mouse pos
                float distPow = pow(dist, 4.); // exponential as you are far from the mouse
                float strengthAmount = uBulgeStrength / (1.0 + distPow); // strength

                uv *= (1. - uBulge) + uBulge * strengthAmount; // use uBulge to smoothly reset/add effect

                uv += center; // reset pos

                return uv;
            }

            // SDF for rounded box
            float sdRoundedBox(vec2 p, vec2 b, float r) {
                vec2 q = abs(p) - b + r;
                return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
            }

            // SDF for triangle (pointing up-right)
            float sdTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
                vec2 e0 = p1 - p0;
                vec2 e1 = p2 - p1;
                vec2 e2 = p0 - p2;
                vec2 v0 = p - p0;
                vec2 v1 = p - p1;
                vec2 v2 = p - p2;
                vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
                vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
                vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
                float s = sign(e0.x * e2.y - e0.y * e2.x);
                vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                                 vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                                 vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
                return -sqrt(d.x) * sign(d.y);
            }

            void main() {
                // Apply bulge effect to UVs
                vec2 mixMouse = mix(uMouseIntro, uMouse, uIntro);
                vec2 bulgedUV = bulge(vUvCover, mixMouse);

                // Create custom shape with SDF (calculate once)
                vec2 p = vUv - 0.5;

                // Rounded box
                float cornerRadius = 0.02;
                float boxSDF = sdRoundedBox(p, vec2(0.5, 0.5), cornerRadius);

                // Triangle cutout in bottom right (less steep = larger triangle)
                vec2 t0 = vec2(0.5, -0.5);   // Bottom right corner
                vec2 t1 = vec2(0.35, -0.5);   // Bottom edge, further left
                vec2 t2 = vec2(0.5, -0.35);   // Right edge, further up
                float triangleSDF = sdTriangle(p, t0, t1, t2);

                // Combine: subtract triangle from box
                float finalSDF = max(boxSDF, -triangleSDF);

                // Convert SDF to alpha with smooth edge (adjusted range to prevent thin line)
                float alpha = 1.0 - smoothstep(-0.00001, 0.00001, finalSDF);

                // Determine color based on face
                vec4 color;
                if (gl_FrontFacing) {
                    // Front face - show texture with bulge effect
                    color = texture2D(uTexture, bulgedUV);
                    color.a *= alpha;

                    // Add gradient from halfway down to bottom
                    vec3 gradientColor = vec3(2.0/255.0, 0.0, 27.0/255.0); // 0x02001B
                    float gradientStart = 0.5; // Start halfway down
                    float gradientEnd = 0.0;   // End at bottom
                    float gradientFactor = smoothstep(gradientStart, gradientEnd, vUv.y);

                    // Mix texture with gradient color
                    color.rgb = mix(color.rgb, gradientColor, gradientFactor);
                } else {
                    // Back face - show solid color
                    color = vec4(uBackColor, alpha);
                }

                gl_FragColor = color;
            }
        `
	}
}

export default ImageCylinderMaterial
