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

		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.setPixelRatio(Math.min(1.4))
		this.renderer.outputEncoding = THREE.sRGBEncoding
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		this.renderer.outputColorSpace = THREE.SRGBColorSpace
		this.renderer.setScissorTest(true)
		this.renderer.autoClear = false

		this.updateCanvasRect()

		return this
	}

	updateCanvasRect() {
		this.canvasRect = this.canvas.getBoundingClientRect()
	}

	registerScene(id, scene) {
		this.scenes.set(id, scene)
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
		if (this.scenes.has(sceneId)) {
			this.postProcessing.set(sceneId, postProcessor)
		}
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

		this.visibleScenes.forEach((sceneId) => {
			const scene = this.scenes.get(sceneId)
			if (scene && scene.isVisible) {
				this.renderSceneInViewport(scene, sceneId, deltaTime)
			}
		})
	}

	renderSceneInViewport(scene, sceneId, deltaTime) {
		const containerRect = scene.container.getBoundingClientRect()
		const viewport = this.calculateViewport(containerRect)

		if (viewport.width <= 0 || viewport.height <= 0) {
			return
		}

		// Set viewport and scissor
		this.renderer.setViewport(
			containerRect.left - this.canvasRect.left,
			this.canvasRect.height - (containerRect.bottom - this.canvasRect.top),
			containerRect.width,
			containerRect.height
		)

		this.renderer.setScissor(
			viewport.x,
			viewport.y,
			viewport.width,
			viewport.height
		)

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
			this.canvasRect.width,
			containerRect.right - canvasLeft
		)
		const bottom = Math.min(
			this.canvasRect.height,
			containerRect.bottom - canvasTop
		)

		const glY = this.canvasRect.height - bottom

		return {
			x: Math.round(left),
			y: Math.round(glY),
			width: Math.round(right - left),
			height: Math.round(bottom - top),
		}
	}

	resize(width, height) {
		this.renderer.setSize(width, height)
		this.updateCanvasRect()

		this.scenes.forEach((scene) => {
			const rect = scene.container.getBoundingClientRect()
			scene.updateCameraForViewport(rect.width, rect.height)
			scene.onResize?.()
		})

		this.postProcessing.forEach((postProcessor) => {
			postProcessor.resize(width, height)
		})
	}

	dispose() {
		this.postProcessing.forEach((postProcessor) => postProcessor.dispose())
		this.postProcessing.clear()
		this.scenes.forEach((scene) => scene.dispose?.())
		this.scenes.clear()
		this.visibleScenes.clear()
		this.renderer?.dispose()
	}
}

export default WebGLManager
