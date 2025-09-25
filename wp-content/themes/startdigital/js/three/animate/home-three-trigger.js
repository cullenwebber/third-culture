import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class HeroScrollTrigger {
	constructor(scene) {
		this.scene = scene
		this.frustrumDimensions = this.scene.getFrustumDimensions()
		this.cornerFrustrumDimensions = this.scene.getFrustumDimensions(-0.33)
		this.init()
	}

	init() {
		this.registerInitialStates()
		this.registerScrolltrigger()
		this.registerAnimations()
	}

	registerInitialStates() {
		this.initialState = {
			cornerPositions:
				this.scene.corners?.map(({ mesh }) => ({ ...mesh.position })) || [],
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
				ease: 'none',
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

					that.scene.corners?.forEach(({ mesh }, index) => {
						mesh.position.y =
							that.initialState.cornerPositions[index].y +
							that.cornerFrustrumDimensions.height * progress
					})
				},
			}
		)
	}
}

export default HeroScrollTrigger
