import * as THREE from 'three'
import WebGLManager from './context-manager'

class SceneManager {
	constructor(canvas) {
		this.webglManager = new WebGLManager().init(canvas)
		this.scenes = new Map()
		this.clock = new THREE.Clock()
		this.isRunning = false

		this.bindEvents()
	}

	addScene(sceneClass, id, container, options = {}) {
		const scene = new sceneClass(id, container, options)
		scene.init()

		this.scenes.set(id, scene)
		this.webglManager.registerScene(id, scene)

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

	bindEvents() {
		const handleResize = () => {
			this.webglManager.resize(window.innerWidth, window.innerHeight)
		}

		const handleScroll = () => {
			this.webglManager.updateCanvasRect()
			this.scenes.forEach((scene) => scene.updateVisibility?.())
		}

		window.addEventListener('resize', handleResize)
		window.addEventListener('scroll', handleScroll, { passive: true })

		// Store references for cleanup
		this.eventCleanup = () => {
			window.removeEventListener('resize', handleResize)
			window.removeEventListener('scroll', handleScroll)
		}
	}

	dispose() {
		this.stop()
		this.eventCleanup?.()
		this.scenes.forEach((scene) => scene.dispose())
		this.scenes.clear()
		this.webglManager.dispose()
	}
}

export default SceneManager
