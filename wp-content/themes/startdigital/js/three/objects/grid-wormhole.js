import * as THREE from 'three'

class GridWormhole extends THREE.Group {
	constructor(options = {}) {
		super()

		this.radius = options.radius ?? 8
		this.length = options.length ?? 50
		this.radialSegments = options.radialSegments ?? 32
		this.lengthSegments = options.lengthSegments ?? 100
		this.ringCount = options.ringCount ?? 60
		this.gridColor = options.gridColor ?? 0x4444ff
		this.speed = options.speed ?? 1
		this.twistAmount = options.twistAmount ?? 0.5

		this.time = 0
		this.ringSpacing = this.length / this.ringCount

		this.createWormhole()
	}

	createWormhole() {
		// Simple material for lines - twist applied via CPU
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				uColor: { value: new THREE.Color(this.gridColor) },
				uLength: { value: this.length },
				uFadeStart: { value: 0.2 },
				uFadeEnd: { value: 0.85 },
			},
			vertexShader: `
				varying float vDepth;
				uniform float uLength;

				void main() {
					vDepth = position.z / uLength;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform vec3 uColor;
				uniform float uFadeStart;
				uniform float uFadeEnd;
				varying float vDepth;

				void main() {
					float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, vDepth);
					float nearFade = smoothstep(0.0, 0.05, vDepth);
					float alpha = fade * nearFade * 0.9;
					gl_FragColor = vec4(uColor * 1.5, alpha);
				}
			`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		})

		// Build longitudinal lines (the corner edges)
		this.buildLongitudinalLines()

		// Build ring lines (will be animated)
		this.buildRingLines()
	}

	buildLongitudinalLines() {
		const positions = []

		for (let i = 0; i < this.radialSegments; i++) {
			const angle = (i / this.radialSegments) * Math.PI * 2
			const x = Math.cos(angle) * this.radius
			const y = Math.sin(angle) * this.radius

			// Create segments along the length for proper twisting
			for (let j = 0; j < this.lengthSegments; j++) {
				const z1 = (j / this.lengthSegments) * this.length
				const z2 = ((j + 1) / this.lengthSegments) * this.length
				const depth1 = z1 / this.length
				const depth2 = z2 / this.length

				// Apply twist
				const angle1 = this.twistAmount * depth1 * Math.PI
				const angle2 = this.twistAmount * depth2 * Math.PI

				const x1 = x * Math.cos(angle1) - y * Math.sin(angle1)
				const y1 = x * Math.sin(angle1) + y * Math.cos(angle1)
				const x2 = x * Math.cos(angle2) - y * Math.sin(angle2)
				const y2 = x * Math.sin(angle2) + y * Math.cos(angle2)

				positions.push(x1, y1, z1)
				positions.push(x2, y2, z2)
			}
		}

		const geometry = new THREE.BufferGeometry()
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

		this.longitudinalLines = new THREE.LineSegments(geometry, this.material)
		this.add(this.longitudinalLines)
	}

	buildRingLines() {
		// Store ring data for animation
		this.rings = []

		for (let j = 0; j < this.ringCount; j++) {
			const positions = []
			const baseZ = (j / this.ringCount) * this.length

			for (let i = 0; i < this.radialSegments; i++) {
				const angle1 = (i / this.radialSegments) * Math.PI * 2
				const angle2 = ((i + 1) / this.radialSegments) * Math.PI * 2

				positions.push(
					Math.cos(angle1) * this.radius,
					Math.sin(angle1) * this.radius,
					0
				)
				positions.push(
					Math.cos(angle2) * this.radius,
					Math.sin(angle2) * this.radius,
					0
				)
			}

			const geometry = new THREE.BufferGeometry()
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

			const ring = new THREE.LineSegments(geometry, this.material)
			ring.userData.baseZ = baseZ

			this.rings.push(ring)
			this.add(ring)
		}

		this.updateRings(0)
	}

	updateRings(time) {
		const offset = (time * this.speed) % this.ringSpacing

		for (const ring of this.rings) {
			// Calculate current z position with offset
			let z = ring.userData.baseZ - offset

			// Wrap around
			if (z < 0) {
				z += this.length
			}

			const depth = z / this.length

			// Apply twist based on depth
			const twistAngle = this.twistAmount * depth * Math.PI

			ring.position.z = z
			ring.rotation.z = twistAngle
		}
	}

	update(deltaTime) {
		this.time += deltaTime
		this.updateRings(this.time)
	}

	setColor(color) {
		this.material.uniforms.uColor.value.set(color)
	}

	setSpeed(speed) {
		this.speed = speed
	}
}

export default GridWormhole
