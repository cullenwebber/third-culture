import * as THREE from 'three'
import BaseScene from '../base-scene.js'
import GradientMaterial from '../materials/gradient-material.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class AboutScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.cameraDistance = 5
	}

	setupScene() {
		this.time = 0
	}

	adjustCamera() {
		this.camera.position.z = this.cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	createMaterials() {
		const { width, height } = this.container.getBoundingClientRect()
		this.gradientMaterial = new GradientMaterial()
		this.gradientMaterial.uniforms.resolution.value.set(width, height)
	}

	async createObjects() {
		const { width, height } = this.getFrustumDimensions(0)
		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.gradientMaterial)
		this.background.renderOrder = -1
		this.scene.add(this.background)
	}

	createScrollTriggers() {
		ScrollTrigger.create({
			trigger: this.container,
			start: 'top bottom',
			end: 'bottom top',
			scrub: true,
			onUpdate: (self) => {
				if (this.gradientMaterial) {
					this.gradientMaterial.uniforms.progress.value = self.progress
				}
			},
		})
	}

	animate(deltaTime) {
		if (!this.isInitialized) return

		this.time += deltaTime

		if (this.gradientMaterial) {
			this.gradientMaterial.uniforms.time.value += deltaTime
		}
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}

	onResize(width, height) {
		super.onResize(width, height)
		this.adjustCamera()

		const { width: cw, height: ch } = this.container.getBoundingClientRect()

		if (this.gradientMaterial) {
			this.gradientMaterial.uniforms.resolution.value.set(cw, ch)
		}

		if (this.background) {
			const { width: fw, height: fh } = this.getFrustumDimensions(0)
			this.background.geometry.dispose()
			this.background.geometry = new THREE.PlaneGeometry(fw, fh, 1, 1)
		}
	}

	dispose() {
		ScrollTrigger.getAll().forEach((st) => {
			if (st.trigger === this.container) st.kill()
		})
		if (this.gradientMaterial) this.gradientMaterial.dispose()
		super.dispose()
	}
}

export default AboutScene
