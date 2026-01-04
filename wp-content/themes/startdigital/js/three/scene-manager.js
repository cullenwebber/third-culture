import * as THREE from 'three'
import WebGLManager from './context-manager'
import { getLenis } from '../utils/smooth-scroll'

class SceneManager {
	constructor(canvas) {
		this.canvas = canvas
		this.webglManager = new WebGLManager().init(canvas)
		this.scenes = new Map()
		this.clock = new THREE.Clock()
		this.isRunning = false
		this.lenis = getLenis()
		this.bindEvents()
	}

	async addScene(sceneClass, id, container, priority = 0, options = {}) {
		const scene = new sceneClass(id, container, options)
		await scene.init()

		this.scenes.set(id, scene)
		this.webglManager.registerScene(id, scene, priority)

		return scene
	}

	removeScene(id) {
		const scene = this.scenes.get(id)
		if (scene) {
			scene.dispose()
			this.scenes.delete(id)
			this.webglManager.unregisterScene(id)
		}
	}

	getScene(id) {
		return this.scenes.get(id)
	}

	start() {
		if (!this.isRunning) {
			this.isRunning = true
			this.animate()
		}
	}

	stop() {
		this.isRunning = false
	}

	animate() {
		if (!this.isRunning) return

		const deltaTime = this.clock.getDelta()

		this.scenes.forEach((scene) => {
			if (scene.isVisible) {
				scene.animate(deltaTime)
			}
		})

		this.webglManager.render()

		requestAnimationFrame(() => this.animate())
	}

	handleScroll() {
		this.webglManager.updateCanvasRect()
		this.scenes.forEach((scene) => scene.updateVisibility?.())
	}

	// Only update visibility for scenes in the initial viewport (no scroll)
	handleInitialVisibility() {
		this.webglManager.updateCanvasRect()
		const viewportHeight = window.innerHeight

		this.scenes.forEach((scene) => {
			const rect = scene.container.getBoundingClientRect()
			// Only update scenes that start within the viewport
			if (rect.top < viewportHeight) {
				scene.updateVisibility?.()
			}
		})
	}

	handleResize() {
		this.webglManager.resize()
	}

	bindEvents() {
		this.scrollHandler = this.handleScroll.bind(this)
		this.lenis?.on('scroll', this.scrollHandler)
		this.resizeObserver = new ResizeObserver(this.handleResize.bind(this))
		this.resizeObserver.observe(document.body)

		// Listen for page transition start to update visibility for initial viewport only
		this.pageTransitionHandler = () => {
			this.handleInitialVisibility()
		}
		window.addEventListener('pageTransitionStart', this.pageTransitionHandler)
	}

	eventCleanup() {
		this.resizeObserver?.disconnect()
		// Remove lenis scroll handler
		if (this.lenis && this.scrollHandler) {
			this.lenis.off('scroll', this.scrollHandler)
		}
		// Remove page transition handler
		if (this.pageTransitionHandler) {
			window.removeEventListener(
				'pageTransitionStart',
				this.pageTransitionHandler
			)
		}
	}

	dispose() {
		this.stop()
		this.eventCleanup()
		this.scenes.forEach((scene) => scene.dispose())
		this.scenes.clear()
		this.webglManager.dispose()
		this.lenis = null
	}
}

export default SceneManager
