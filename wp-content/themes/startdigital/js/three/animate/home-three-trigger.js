import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class HeroScrollTrigger {
	constructor(scene) {
		this.scene = scene
		this.frustrumDimensions = this.scene.getFrustumDimensions()
		this.init()
	}

	init() {
		this.registerInitialStates()
		this.registerScrolltrigger()
		this.registerAnimations()
	}

	registerInitialStates() {
		this.initialState = {
			logoPosition: {
				...this.scene.logo.position,
			},
		}
	}

	registerScrolltrigger() {
		this.heroTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#home-hero-trigger',
				start: 'top top',
				end: '+=100%',
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
					that.scene.logo.position.y =
						that.initialState.logoPosition.y +
						that.frustrumDimensions.height * progress
				},
			}
		)
	}
}

export default HeroScrollTrigger
