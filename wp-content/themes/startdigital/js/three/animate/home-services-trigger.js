import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class servicesScrollTrigger {
	constructor(scene) {
		this.scene = scene
		this.meshs = this.scene.meshs
		this.triggerContainers = Array.from({ length: 4 }).map((_, i) => {
			return document.querySelector(`#service-text-${i}`)
		})

		console.log(this.triggerContainers)
		this.init()
	}

	init() {
		this.registerInitialStates()
		this.registerScrolltrigger()
		this.registerAnimations()
	}

	registerInitialStates() {}

	registerScrolltrigger() {
		this.servicesTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#service-0',
				start: 'center center',
				endTrigger: '#service-scroll-container',
				end: 'bottom bottom',
				pin: true,
				pinSpacing: false,
				scrub: true,
				ease: 'none',
			},
		})
	}

	registerAnimations() {
		const that = this

		this.servicesTl.to(
			{},
			{
				// onUpdate: function () {
				// 	const progress = this.progress()
				// 	that.meshs[0].traverse((child) => {
				// 		if (!child.isMesh) return
				// 		child.scale.set(progress, progress, progress)
				// 	})
				// },
			}
		)

		this.triggerContainers.forEach((triggerEl, i) => {
			const mesh = this.meshs[i]

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: triggerEl,
					start: 'top center',
					end: 'bottom center',
					markers: false,
					toggleActions: 'play reverse play reverse',
				},
			})

			let isFirst = true

			mesh.traverse((child) => {
				if (!child.isMesh) return
				tl.to(
					child.scale,
					{
						x: 1,
						y: 1,
						z: 1,
						delay: isFirst ? 0.15 : 0,
						ease: 'power2.inOut',
						duration: 0.35,
					},
					'<=5%'
				)

				isFirst = false
			})

			const textTl = gsap.timeline({
				scrollTrigger: {
					trigger: triggerEl,
					start: 'center 80%',
					end: 'center 20%',
					markers: false,
					toggleActions: 'play reverse play reverse',
				},
			})

			textTl.to(triggerEl.querySelector('.capability-text'), {
				filter: 'blur(0px)',
				opacity: 1,
				duration: 0.65,
				ease: 'power2.inOut',
			})
		})
	}
}

export default servicesScrollTrigger
