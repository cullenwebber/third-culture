import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class CapabilitesScrollTrigger {
	constructor(scene) {
		this.scene = scene
		this.meshLength = this.scene.meshs.length
		this.init()
	}

	init() {
		this.registerInitialStates()
		this.registerScrolltrigger()
	}

	registerInitialStates() {
		this.initialState = {
			meshsY: this.scene.meshs.map((mesh) => {
				return mesh.position.y
			}),
		}
	}

	registerScrolltrigger() {
		const mm = gsap.matchMedia()

		// Desktop ScrollTrigger animation
		mm.add('(min-width: 1024px)', () => {
			this.capabilitiesTl = gsap.timeline({
				scrollTrigger: {
					trigger: '#home-capabilities-scroller',
					start: 'top-=120px top',
					end: 'bottom+=120px bottom',
					pin: '#home-capabilities-wrapper',
					scrub: true,
				},
			})

			this.registerScrollAnimations()
		})

		// Mobile looping animation
		mm.add('(max-width: 1023px)', () => {
			this.mobileLoopTl = gsap.timeline({ repeat: -1 })
			this.registerLoopAnimations()
		})
	}

	registerScrollAnimations() {
		const that = this
		this.capabilitiesTl.to(
			{},
			{
				onUpdate: function () {
					const progress = this.progress()
					that.scene.meshs.forEach((mesh, i) => {
						mesh.position.y =
							that.initialState.meshsY[i] +
							8.0 * (that.meshLength - 1.0) * progress

						const meshProgress = progress - i / (that.meshLength - 1.0)

						mesh.rotation.x =
							-Math.PI * (that.meshLength - 1.0 - i) * 3.0 +
							Math.PI * 3.0 * meshProgress
					})
				},
			}
		)
	}

	registerLoopAnimations() {
		const that = this
		this.mobileLoopTl.to(
			{},
			{
				duration: 8,
				onUpdate: function () {
					const progress = this.progress()
					that.scene.meshs.forEach((mesh, i) => {
						mesh.position.y =
							that.initialState.meshsY[i] +
							8.0 * (that.meshLength - 1.0) * progress

						const meshProgress = progress - i / (that.meshLength - 1.0)

						mesh.rotation.x =
							-Math.PI * (that.meshLength - 1.0 - i) * 3.0 +
							Math.PI * 3.0 * meshProgress
					})
				},
			}
		)
	}
}

export default CapabilitesScrollTrigger
