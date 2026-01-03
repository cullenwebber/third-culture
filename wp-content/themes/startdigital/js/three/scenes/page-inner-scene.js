import * as THREE from 'three'
import BaseScene from '../base-scene.js'
import WhiteBackgroundMaterial from '../materials/white-background-material.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class PageInnerScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.cameraDistance = 5
	}

	adjustCamera() {
		this.camera.position.z = this.cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	createMaterials() {
		this.whiteMaterial = new WhiteBackgroundMaterial()
	}

	createObjects() {
		const { width, height } = this.getFrustumDimensions(0)
		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.whiteMaterial)
		this.background.renderOrder = -1
		this.scene.add(this.background)
	}

	createLights() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
		this.scene.add(ambientLight)
	}

	createScrollTriggers() {
		const entirePage = document.querySelector('#entire-page')
		if (!entirePage) return

		const ratio = entirePage.getBoundingClientRect().width / window.innerHeight

		ScrollTrigger.create({
			trigger: entirePage,
			start: 'top top',
			end: 'bottom bottom',
			scrub: true,
			onUpdate: (self) => {
				if (this.whiteMaterial) {
					this.whiteMaterial.uniforms.uScroll.value = -self.progress * ratio
				}
			},
		})
	}

	animate(deltaTime) {
		if (!this.isInitialized) return
		this.time += deltaTime
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

		if (this.background) {
			const { width: frustumWidth, height: frustumHeight } =
				this.getFrustumDimensions(0)
			this.background.geometry.dispose()
			this.background.geometry = new THREE.PlaneGeometry(
				frustumWidth,
				frustumHeight,
				1,
				1
			)
		}
	}

	dispose() {
		ScrollTrigger.getAll().forEach((st) => {
			if (st.trigger === document.querySelector('#entire-page')) {
				st.kill()
			}
		})

		if (this.whiteMaterial) this.whiteMaterial.dispose()
		super.dispose()
	}
}

export default PageInnerScene
