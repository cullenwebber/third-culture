import * as THREE from 'three'

class WhiteBackgroundGridMaterial extends THREE.ShaderMaterial {
	constructor(options = {}) {
		super()

		this.uniforms = {
			color: { value: new THREE.Color('#F7F7F7') },
			aspectRatio: { value: window.innerWidth / window.innerHeight },
			gridSize: { value: 45.0 },
			gridOpacity: { value: 0.05 },
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
            uniform float uScroll;
            varying vec2 vUv;

            float grid(vec2 uv, float size) {
                // Calculate aspect ratio from UV derivatives
                vec2 ddx_uv = dFdx(uv);
                vec2 ddy_uv = dFdy(uv);
                float aspectRatio = length(ddx_uv) / length(ddy_uv);

                // Center UV coordinates (0.5, 0.5 becomes origin)
                vec2 centeredUv = uv - 0.5;

                // Adjust UV coordinates to maintain square grid
                vec2 adjustedUv;

                if (aspectRatio < 1.0) {
                    adjustedUv = vec2(centeredUv.x, centeredUv.y * aspectRatio);
                } else {
                    adjustedUv = vec2(centeredUv.x / aspectRatio, centeredUv.y);
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

                float gridPattern = grid(uv, gridSize);

                vec3 finalColor = color;
                finalColor -= vec3(gridPattern * gridOpacity);

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `
	}
}

export default WhiteBackgroundGridMaterial
