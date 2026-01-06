import * as THREE from 'three'

class WebGLManager {
	constructor() {
		if (WebGLManager.instance) {
			return WebGLManager.instance
		}

		this.renderer = null
		this.canvas = null
		this.scenes = new Map()
		this.visibleScenes = new Set()
		this.canvasRect = null
		this.postProcessing = new Map()
		this.fullScreenDimensions = { width: 0, height: 0 }

		WebGLManager.instance = this
	}

	init(canvas, options = {}) {
		this.canvas = canvas
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
			...options,
		})

		this.updateFullScreenDimensions()

		this.renderer.setSize(
			this.fullScreenDimensions.width,
			this.fullScreenDimensions.height
		)
		this.renderer.setPixelRatio(Math.min(1.2))
		this.renderer.outputEncoding = THREE.sRGBEncoding
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		this.renderer.outputColorSpace = THREE.SRGBColorSpace
		this.renderer.setScissorTest(true)
		this.renderer.autoClear = false
		this.renderer.localClippingEnabled = true

		this.updateCanvasRect()

		return this
	}

	getFullScreenDimensions() {
		const tempElement = document.createElement('div')
		tempElement.style.height = '100lvh'
		tempElement.style.width = '100lvw'
		tempElement.style.position = 'absolute'
		tempElement.style.visibility = 'hidden'
		document.body.appendChild(tempElement)

		const width = tempElement.offsetWidth
		const height = tempElement.offsetHeight

		document.body.removeChild(tempElement)

		return { width, height }
	}

	updateFullScreenDimensions() {
		this.fullScreenDimensions = this.getFullScreenDimensions()
	}

	updateCanvasRect() {
		this.canvasRect = this.canvas.getBoundingClientRect()
	}

	registerScene(id, scene, priority = 0) {
		this.scenes.set(id, { scene, priority })
		const rect = scene.container.getBoundingClientRect()
		scene.updateCameraForViewport(rect.width, rect.height)
	}

	unregisterScene(id) {
		const postProcessor = this.postProcessing.get(id)
		if (postProcessor) {
			postProcessor.dispose()
			this.postProcessing.delete(id)
		}

		this.scenes.delete(id)
		this.visibleScenes.delete(id)
	}

	addPostProcessing(sceneId, postProcessor) {
		// Don't check if scene exists - it may not be registered yet during init
		this.postProcessing.set(sceneId, postProcessor)
	}

	removePostProcessing(sceneId) {
		const postProcessor = this.postProcessing.get(sceneId)
		if (postProcessor) {
			postProcessor.dispose()
			this.postProcessing.delete(sceneId)
		}
	}

	addVisibleScene(id) {
		this.visibleScenes.add(id)
	}

	removeVisibleScene(id) {
		this.visibleScenes.delete(id)
	}

	render(deltaTime = 0) {
		this.renderer.clear()
		this.updateCanvasRect()

		const sortedScenes = Array.from(this.visibleScenes)
			.map((sceneId) => ({
				id: sceneId,
				...this.scenes.get(sceneId),
			}))
			.filter((item) => item.scene && item.scene.isVisible)
			.sort((a, b) => a.priority - b.priority)

		sortedScenes.forEach(({ id, scene }) => {
			this.renderSceneInViewport(scene, id, deltaTime)
		})
	}

	renderSceneInViewport(scene, sceneId, deltaTime) {
		const containerRect = scene.container.getBoundingClientRect()
		const viewport = this.calculateViewport(containerRect)

		if (viewport.width <= 0 || viewport.height <= 0) {
			return
		}

		// Set viewport and scissor using full screen dimensions
		this.renderer.setViewport(
			containerRect.left - this.canvasRect.left,
			this.fullScreenDimensions.height -
				(containerRect.bottom - this.canvasRect.top),
			containerRect.width,
			containerRect.height
		)

		this.renderer.setScissor(
			viewport.x,
			viewport.y,
			viewport.width,
			viewport.height
		)

		// Call preRender hook for shadow maps, etc.
		if (scene.preRender) {
			scene.preRender(this.renderer)
		}

		const postProcessor = this.postProcessing.get(sceneId)

		if (postProcessor) {
			this.renderer.clear(true, true, true)
			postProcessor.render(deltaTime)
		} else {
			this.renderer.render(scene.scene, scene.camera)
		}
	}

	calculateViewport(containerRect) {
		const canvasTop = this.canvasRect.top
		const canvasLeft = this.canvasRect.left

		const left = Math.max(0, containerRect.left - canvasLeft)
		const top = Math.max(0, containerRect.top - canvasTop)
		const right = Math.min(
			this.fullScreenDimensions.width,
			containerRect.right - canvasLeft
		)
		const bottom = Math.min(
			this.fullScreenDimensions.height,
			containerRect.bottom - canvasTop
		)

		const glY = this.fullScreenDimensions.height - bottom

		return {
			x: Math.round(left),
			y: Math.round(glY),
			width: Math.round(right - left),
			height: Math.round(bottom - top),
		}
	}

	resize() {
		this.updateFullScreenDimensions()
		this.renderer.setSize(
			this.fullScreenDimensions.width,
			this.fullScreenDimensions.height
		)
		this.updateCanvasRect()

		this.scenes.forEach(({ scene }) => {
			const sceneContainer = scene?.container

			if (!sceneContainer) return

			const rect = sceneContainer.getBoundingClientRect()
			scene.updateCameraForViewport(rect.width, rect.height)
			scene.onResize?.()
		})

		this.postProcessing.forEach((postProcessor) => {
			postProcessor.resize(
				this.fullScreenDimensions.width,
				this.fullScreenDimensions.height
			)
		})
	}

	dispose() {
		this.postProcessing.forEach((postProcessor) => postProcessor.dispose())
		this.postProcessing.clear()
		this.scenes.forEach(({ scene }) => scene.dispose?.())
		this.scenes.clear()
		this.visibleScenes.clear()

		if (this.renderer) {
			this.renderer.dispose()
			this.renderer.forceContextLoss()
			this.renderer = null
		}

		this.canvas = null

		// Clear singleton so it can be recreated
		WebGLManager.instance = null
	}
}

export default WebGLManager
