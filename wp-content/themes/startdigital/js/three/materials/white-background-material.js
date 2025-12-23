import * as THREE from 'three'

class WhiteBackgroundMaterial extends THREE.ShaderMaterial {
	constructor(options = {}) {
		super()

		this.uniforms = {
			color: { value: new THREE.Color('#F7F7F7') },
			aspectRatio: { value: window.innerWidth / window.innerHeight },
			gridSize: { value: 45.0 },
			gridOpacity: { value: 0.05 },
			plusColor: { value: new THREE.Color('#d1d1d1') },
			uScroll: { value: 0 },
		}

		this.vertexShader = this.getVertexShader()
		this.fragmentShader = this.getFragmentShader()
		this.depthTest = true
		this.depthWrite = false
		this.transparent = false
	}

	getVertexShader() {
		return /* glsl */ `
            varying vec2 vUv;

            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `
	}

	getFragmentShader() {
		return /* glsl */ `
            uniform vec3 color;
            uniform float aspectRatio;
			uniform float gridSize;
			uniform float gridOpacity;
			uniform vec3 plusColor;
			uniform float uScroll;
            varying vec2 vUv;

            // SDF for a plus/cross shape
            float sdPlus(vec2 p, float size, float thickness) {
                vec2 d = abs(p) - vec2(size, thickness);
                float horizontal = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);

                d = abs(p) - vec2(thickness, size);
                float vertical = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);

                return min(horizontal, vertical);
            }

            float grid(vec2 uv, float size) {
                // Calculate aspect ratio from UV derivatives
                vec2 ddx_uv = dFdx(uv);
                vec2 ddy_uv = dFdy(uv);
                float aspectRatio = length(ddx_uv) / length(ddy_uv);
                
                // Adjust UV coordinates to maintain square grid
                vec2 adjustedUv;
                
                if (aspectRatio < 1.0) {
                    adjustedUv = vec2(uv.x, uv.y * aspectRatio);
                } else {
                    adjustedUv = vec2(uv.x / aspectRatio, uv.y);
                }
                
                // Scale by grid size
                adjustedUv *= size;
                
                // Calculate derivatives for adaptive line width (prevents aliasing)
                vec2 grid_uv = fract(adjustedUv);
                vec2 ddx = dFdx(adjustedUv);
                vec2 ddy = dFdy(adjustedUv);
                
                // Adaptive line width based on screen resolution
                vec2 lineWidth = max(abs(ddx), abs(ddy)) * 0.75;
                
                // Create anti-aliased grid lines
                vec2 gridLines = abs(grid_uv - 0.5);
                vec2 grid_aa = smoothstep(0.5 - lineWidth, 0.5 - lineWidth * 0.5, gridLines);
                
                return max(grid_aa.x, grid_aa.y);
            }

            void main() {

                vec2 uv = vUv;
				uv.y += uScroll;
				vec2 ddx_uv = dFdx(uv);
				vec2 ddy_uv = dFdy(uv);
				float derivedAspectRatio = length(ddx_uv) / length(ddy_uv);

                // Adjust UV coordinates to maintain square grid
                vec2 adjustedUv;
                if (derivedAspectRatio < 1.0) {
                    adjustedUv = vec2(uv.x, uv.y * derivedAspectRatio);
                } else {
                    adjustedUv = vec2(uv.x / derivedAspectRatio, uv.y);
                }

                // Scale by grid size
                adjustedUv *= gridSize;

                float gridPattern = grid(uv, gridSize);

                // Create repeating 7x7 pattern for pluses
                vec2 patternUv = mod(adjustedUv, 7.0);

                // Draw plus at the (0,0) intersection of each 7x7 tile
                float plusPattern = 0.0;

                // Check all 4 corners of current cell in the pattern
                vec2 patternCell = floor(patternUv);
                vec2 patternLocal = fract(patternUv);

                for (int y = 0; y <= 1; y++) {
                    for (int x = 0; x <= 1; x++) {
                        vec2 corner = patternCell + vec2(float(x), float(y));

                        // Check if this corner is at position 0 (or 7, which wraps to 0)
                        // Use mod to handle the wrap-around
                        vec2 wrappedCorner = mod(corner, 7.0);

                        if (abs(wrappedCorner.x) < 0.01 && abs(wrappedCorner.y) < 0.01) {
                            vec2 cornerLocalPos = patternLocal - vec2(float(x), float(y));

                            float plusSize = 0.2;
                            float plusThickness = 0.02;
                            float plusSDF = sdPlus(cornerLocalPos, plusSize, plusThickness);

                            float p = 1.0 - smoothstep(-0.001, 0.001, plusSDF);
                            plusPattern = max(plusPattern, p);
                        }
                    }
                }

                vec3 finalColor = color;
                finalColor -= vec3(gridPattern * gridOpacity);
                finalColor = mix(finalColor, plusColor, plusPattern); 

                gl_FragColor = vec4(finalColor, 1.0); // White color
            }
        `
	}
}

export default WhiteBackgroundMaterial
