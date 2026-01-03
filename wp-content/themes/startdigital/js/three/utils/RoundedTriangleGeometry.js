import * as THREE from 'three'

/**
 * Creates a rounded right-angled triangular prism geometry
 */
class RoundedTriangleGeometry extends THREE.BufferGeometry {
	constructor(size = 1, depth = 1, radius = 0.1, segments = 4) {
		super()

		this.type = 'RoundedTriangleGeometry'

		// Parameters
		const r = radius
		const s = segments

		// Right-angled triangle (isoceles: 45-45-90)
		// Centered around the centroid
		const halfSize = size / 2

		// Triangle vertices for right angle at bottom-left
		// Centroid of a triangle is at (avg of x coords, avg of y coords)
		const cx = (-halfSize + halfSize + -halfSize) / 3
		const cy = (-halfSize + -halfSize + halfSize) / 3

		const trianglePoints = [
			new THREE.Vector2(-halfSize - cx, -halfSize - cy), // Bottom left (right angle)
			new THREE.Vector2(halfSize - cx, -halfSize - cy), // Bottom right
			new THREE.Vector2(-halfSize - cx, halfSize - cy), // Top left
		]

		// Create rounded triangle shape
		const shape = this.createRoundedTriangleShape(trianglePoints, r, s)

		// Extrude settings with bevel for rounded edges on depth
		const extrudeSettings = {
			depth: depth - r * 2,
			bevelEnabled: true,
			bevelThickness: r,
			bevelSize: r,
			bevelSegments: s,
		}

		// Create geometry from extrusion
		const extrudeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

		// Center the geometry
		extrudeGeometry.center()

		// Copy attributes from extruded geometry
		this.copy(extrudeGeometry)

		// Compute normals for proper lighting
		this.computeVertexNormals()
	}

	createRoundedTriangleShape(points, radius, segments) {
		const shape = new THREE.Shape()

		const numPoints = points.length

		for (let i = 0; i < numPoints; i++) {
			const current = points[i]
			const next = points[(i + 1) % numPoints]
			const prev = points[(i + numPoints - 1) % numPoints]

			// Vectors to adjacent points
			const toPrev = new THREE.Vector2().subVectors(prev, current).normalize()
			const toNext = new THREE.Vector2().subVectors(next, current).normalize()

			// Calculate corner angle
			const angle = Math.acos(toPrev.dot(toNext))
			const halfAngle = angle / 2

			// Distance to offset corner for radius
			const cornerOffset = radius / Math.tan(halfAngle)

			// Points where the arc starts and ends
			const arcStart = new THREE.Vector2()
				.copy(current)
				.addScaledVector(toPrev, cornerOffset)
			const arcEnd = new THREE.Vector2()
				.copy(current)
				.addScaledVector(toNext, cornerOffset)

			// Center of the arc
			const bisector = new THREE.Vector2().addVectors(toPrev, toNext).normalize()
			const centerDist = radius / Math.sin(halfAngle)
			const arcCenter = new THREE.Vector2()
				.copy(current)
				.addScaledVector(bisector, centerDist)

			if (i === 0) {
				shape.moveTo(arcStart.x, arcStart.y)
			} else {
				shape.lineTo(arcStart.x, arcStart.y)
			}

			// Draw arc
			const startAngle = Math.atan2(
				arcStart.y - arcCenter.y,
				arcStart.x - arcCenter.x
			)
			const endAngle = Math.atan2(
				arcEnd.y - arcCenter.y,
				arcEnd.x - arcCenter.x
			)

			// Draw arc using absarc (absolute arc)
			shape.absarc(
				arcCenter.x,
				arcCenter.y,
				radius,
				startAngle,
				endAngle,
				false
			)
		}

		shape.closePath()
		return shape
	}
}

export { RoundedTriangleGeometry }
