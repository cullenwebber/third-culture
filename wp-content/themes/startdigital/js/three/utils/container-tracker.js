import { getLenis } from '../../utils/smooth-scroll'

class ContainerTracker {
	constructor(scene, camera, container) {
		this.scene = scene
		this.camera = camera
		this.container = container
		this.trackedObjects = new Map()
		this.lenis = getLenis()
		this.setupLenisListener()
	}

	addTrackedObject(id, config) {
		const tracker = {
			id,
			object3D: config.object3D,
			htmlContainer: config.htmlContainer,
			scale: config.scale || 1.0,
			scaleMultiplier: config.scaleMultiplier || 1.0,
			offsetZ: config.offsetZ || 0,
			offsetX: config.offsetX || 0,
			offsetY: config.offsetY || 0,
			originalDimensions: config.originalDimensions || null,
			scalingMode: config.scalingMode || 'width',
			enabled: true,
		}

		this.trackedObjects.set(id, tracker)
		this.updatePosition(id)
	}

	removeTrackedObject(id) {
		this.trackedObjects.delete(id)
	}

	updatePosition(id) {
		const tracker = this.trackedObjects.get(id)
		if (
			!tracker ||
			!tracker.enabled ||
			!tracker.object3D ||
			!tracker.htmlContainer
		) {
			return
		}

		const rect = tracker.htmlContainer.getBoundingClientRect()
		const containerRect = this.container.getBoundingClientRect()

		// Calculate world dimensions
		const worldDimensions = this.getWorldSizeFromPixels({
			width: rect.width,
			height: rect.height,
		})

		// Calculate scale based on scaling mode
		let scale = tracker.scale
		if (tracker.originalDimensions && tracker.scaleMultiplier) {
			switch (tracker.scalingMode) {
				case 'width':
					const targetWidth = worldDimensions.width * tracker.scaleMultiplier
					scale = targetWidth / tracker.originalDimensions.width
					break
				case 'height':
					const targetHeight = worldDimensions.height * tracker.scaleMultiplier
					scale = targetHeight / tracker.originalDimensions.height
					break
				case 'contain':
					const scaleWidth =
						(worldDimensions.width * tracker.scaleMultiplier) /
						tracker.originalDimensions.width
					const scaleHeight =
						(worldDimensions.height * tracker.scaleMultiplier) /
						tracker.originalDimensions.height
					scale = Math.min(scaleWidth, scaleHeight)
					break
				case 'cover':
					const scaleWidthCover =
						(worldDimensions.width * tracker.scaleMultiplier) /
						tracker.originalDimensions.width
					const scaleHeightCover =
						(worldDimensions.height * tracker.scaleMultiplier) /
						tracker.originalDimensions.height
					scale = Math.max(scaleWidthCover, scaleHeightCover)
					break
			}
		}

		tracker.object3D.scale.setScalar(scale)

		// Calculate center position
		const centerX =
			(rect.left + rect.width / 2 - containerRect.left) / containerRect.width
		const centerY =
			(rect.top + rect.height / 2 - containerRect.top) / containerRect.height

		// Convert to NDC
		const ndcX = centerX * 2 - 1
		const ndcY = -(centerY * 2 - 1)

		// Convert to world coordinates
		const { width, height } = this.getFrustumDimensions()
		const worldX = ndcX * (width / 2) + tracker.offsetX
		const worldY = ndcY * (height / 2) + tracker.offsetY

		tracker.object3D.position.set(worldX, worldY, tracker.offsetZ)
	}

	updateAllPositions() {
		if (!this.trackedObjects) return
		this.trackedObjects.forEach((_, id) => {
			this.updatePosition(id)
		})
	}

	setupLenisListener() {
		this.lenis.on('scroll', this.updateAllPositions.bind(this))
	}

	enableTracking(id) {
		const tracker = this.trackedObjects.get(id)
		if (tracker) {
			tracker.enabled = true
			this.updatePosition(id)
		}
	}

	disableTracking(id) {
		const tracker = this.trackedObjects.get(id)
		if (tracker) {
			tracker.enabled = false
		}
	}

	getTrackedObject(id) {
		return this.trackedObjects.get(id)
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
		const containerRect = this.container.getBoundingClientRect()
		const { width: frustumWidth, height: frustumHeight } =
			this.getFrustumDimensions(0)

		const result = {}

		if (options.width !== undefined) {
			const worldUnitsPerPixel = frustumWidth / containerRect.width
			result.width = options.width * worldUnitsPerPixel
		}

		if (options.height !== undefined) {
			const worldUnitsPerPixel = frustumHeight / containerRect.height
			result.height = options.height * worldUnitsPerPixel
		}

		return result
	}

	dispose() {
		this.trackedObjects.clear()
	}
}

export default ContainerTracker
