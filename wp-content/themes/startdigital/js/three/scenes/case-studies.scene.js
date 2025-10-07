import * as THREE from 'three'
import BaseScene from '../base-scene'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { getStaticPath } from '../utils'
import PulseMaterial from '../materials/pulse-material'

class CaseStudiesScene extends BaseScene {
	createMaterials() {
		this.material = new PulseMaterial()
	}

	createObjects() {
		this.configureLoader()
		this.loadLogo()
		this.logoChildren = []

		// Add resize listener
		this.handleResize = this.handleResize.bind(this)
		window.addEventListener('resize', this.handleResize)
	}

	configureLoader() {
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
		)
		this.gltfLoader = new GLTFLoader()
		this.gltfLoader.setDRACOLoader(dracoLoader)
	}

	getResponsiveScale() {
		const width = window.innerWidth

		if (width < 480) {
			return 1.5
		} else if (width < 768) {
			return 2
		} else if (width < 1024) {
			return 2.5
		} else {
			return 3
		}
	}

	async loadLogo() {
		const glbPath = getStaticPath('/cube-and-triangle.glb')

		this.gltfLoader.load(glbPath, (gltf) => {
			this.logo = gltf.scene

			this.logo.traverse((child) => {
				if (!child.isMesh) return
				child.material = this.material.getMaterial()

				this.logoChildren.push({
					mesh: child,
					initialPosition: child.position.clone(),
					offset: Math.random() * Math.PI * 2,
					floatSpeed: 0.8 + Math.random() * 0.4,
					floatAmplitude: 0.05 + Math.random() * 0.05,
				})
			})

			// Set initial scale based on screen size
			const scale = this.getResponsiveScale()
			this.logo.scale.set(scale, scale, scale)

			this.scene.add(this.logo)
		})
	}

	handleResize() {
		if (this.logo) {
			const scale = this.getResponsiveScale()
			this.logo.scale.set(scale, scale, scale)
		}
	}

	animate(deltaTime) {
		this.time += deltaTime

		this.material.update(this.time)
		// Animate each child independently
		this.logoChildren.forEach((child) => {
			const t = this.time * child.floatSpeed + child.offset

			// Float up and down
			child.mesh.position.y =
				child.initialPosition.y + 0.2 + Math.sin(t * 0.5) * child.floatAmplitude

			// Gentle rotation on multiple axes
			child.mesh.rotation.x = Math.sin(t * 0.5) * 0.2
			child.mesh.rotation.y = Math.sin(t * 0.1) * 0.1
			child.mesh.rotation.z = Math.cos(t * 0.3) * 0.1
		})
	}

	dispose() {
		window.removeEventListener('resize', this.handleResize)
		if (super.dispose) {
			super.dispose()
		}
	}
}

export default CaseStudiesScene
