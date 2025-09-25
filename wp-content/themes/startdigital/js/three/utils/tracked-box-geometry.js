import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Mesh, MeshBasicMaterial } from 'three'
import { getLenis } from '../../utils/smooth-scroll'

class TrackedRoundedBoxGeometry {
	constructor(scene, camera, config = {}) {
		this.scene = scene
		this.camera = camera
		this.lenis = getLenis()

		this.startElement = config.startElement
		this.endElement = config.endElement
		this.depth = config.depth || 0.1
		this.segments = config.segments || 16
		this.radius = config.radius || 0.02
		this.material =
			config.material || new MeshBasicMaterial({ color: 0x888888 })
		this.offsetX = config.offsetX || 0
		this.offsetY = config.offsetY || 0
		this.offsetZ = config.offsetZ || 0
		this.padding = config.padding || 0 // Initialize padding
		this.enabled = true

		this.geometry = new RoundedBoxGeometry(
			1,
			1,
			this.depth,
			this.segments,
			this.radius
		)
		this.mesh = new Mesh(this.geometry, this.material)
		this.scene.add(this.mesh)

		this.setupLenisListener()
		this.updateGeometry()
	}

	setElements(startElement, endElement) {
		this.startElement = startElement
		this.endElement = endElement
		this.updateGeometry()
	}

	setDepth(depth) {
		this.depth = depth
		this.updateGeometry()
	}

	setRadius(radius) {
		this.radius = radius
		this.updateGeometry()
	}

	setSegments(segments) {
		this.segments = segments
		this.updateGeometry()
	}

	updateGeometry() {
		if (!this.enabled || !this.startElement || !this.endElement) {
			this.mesh.visible = false
			return
		}

		this.mesh.visible = true

		const startRect = this.startElement.getBoundingClientRect()
		const endRect = this.endElement.getBoundingClientRect()

		const topY = startRect.top
		const bottomY = endRect.bottom
		const leftX = Math.min(startRect.left, endRect.left)
		const rightX = Math.max(startRect.right, endRect.right)

		// Add padding to pixel dimensions
		const pixelWidth = rightX - leftX + this.padding * 10
		const pixelHeight = bottomY - topY + this.padding * 2

		const worldDimensions = this.getWorldSizeFromPixels({
			width: pixelWidth,
			height: pixelHeight,
		})

		this.geometry.dispose()
		this.geometry = new RoundedBoxGeometry(
			worldDimensions.width,
			worldDimensions.height,
			this.depth,
			this.segments,
			this.radius
		)

		const aspect = worldDimensions.width / worldDimensions.height
		const uvAttribute = this.geometry.attributes.uv
		for (let i = 0; i < uvAttribute.count; i++) {
			const u = uvAttribute.getX(i)
			const v = uvAttribute.getY(i)
			uvAttribute.setXY(i, u * aspect, v)
		}
		uvAttribute.needsUpdate = true

		this.mesh.geometry = this.geometry

		// Center calculation remains the same (padding centers the box automatically)
		const centerX = leftX + (rightX - leftX) / 2
		const centerY = topY + (bottomY - topY) / 2

		const ndcX = (centerX / window.innerWidth) * 2 - 1
		const ndcY = -((centerY / window.innerHeight) * 2 - 1)

		const { width, height } = this.getFrustumDimensions()
		const worldX = ndcX * (width / 2) + this.offsetX
		const worldY = ndcY * (height / 2) + this.offsetY

		this.mesh.position.set(worldX, worldY, this.offsetZ)
	}

	setupLenisListener() {
		this.lenis.on('scroll', this.updateGeometry.bind(this))
		window.addEventListener('resize', this.updateGeometry.bind(this))
	}

	enable() {
		this.enabled = true
		this.updateGeometry()
	}

	disable() {
		this.enabled = false
		this.mesh.visible = false
	}

	setMaterial(material) {
		this.material = material
		this.mesh.material = material
	}

	setPadding(padding) {
		this.padding = padding
		this.updateGeometry()
	}

	setOffset(x = 0, y = 0, z = 0) {
		this.offsetX = x
		this.offsetY = y
		this.offsetZ = z
		this.updateGeometry()
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}

	getWorldSizeFromPixels(options) {
		const { width: frustumWidth, height: frustumHeight } =
			this.getFrustumDimensions(0)
		const result = {}

		if (options.width !== undefined) {
			const worldUnitsPerPixel = frustumWidth / window.innerWidth
			result.width = options.width * worldUnitsPerPixel
		}

		if (options.height !== undefined) {
			const worldUnitsPerPixel = frustumHeight / window.innerHeight
			result.height = options.height * worldUnitsPerPixel
		}

		return result
	}

	dispose() {
		this.scene.remove(this.mesh)
		this.geometry.dispose()
		if (this.material.dispose) {
			this.material.dispose()
		}
		window.removeEventListener('resize', this.updateGeometry.bind(this))
	}
}

export default TrackedRoundedBoxGeometry
