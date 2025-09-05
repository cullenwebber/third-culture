import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class HomePhysicsTrigger {
	constructor(scene) {
		this.scene = scene
		this.init()
	}

	init() {
		this.registerInitialStates()
		this.registerScrolltrigger()
		this.registerAnimations()
	}

	registerInitialStates() {
		this.initialState = {
			cameraPosition: {
				...this.scene.camera.position,
			},
		}
	}

	registerScrolltrigger() {
		this.heroTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#home-about',
				start: 'top bottom',
				end: 'bottom top',
				pin: false,
				scrub: true,
			},
		})
	}

	registerAnimations() {
		const that = this

		this.heroTl.to(
			{},
			{
				onUpdate: function () {
					const progress = this.progress()

					const angle = Math.PI * progress

					// const radius = Math.sqrt(
					// 	that.initialState.cameraPosition.x ** 2 +
					// 		that.initialState.cameraPosition.z ** 2
					// )

					// that.scene.camera.position.x = Math.cos(angle) * radius
					// that.scene.camera.position.z = Math.sin(angle) * radius

					that.scene.camera.position.y =
						that.initialState.cameraPosition.y -
						2 * that.initialState.cameraPosition.y * progress

					that.scene.backgroundPlane.position.y =
						that.initialState.cameraPosition.y -
						2 * that.initialState.cameraPosition.y * progress

					that.scene.camera.lookAt(0, that.scene.camera.position.y, 0)
				},
			}
		)
	}
}

export default HomePhysicsTrigger
