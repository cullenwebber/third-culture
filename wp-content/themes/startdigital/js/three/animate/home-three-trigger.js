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
			planePosition: {
				...this.scene.overlayPlane.position,
			},
			logoPosition: {
				...this.scene.logo.position,
			},
			stonePosition: {
				...this.scene.stone.position,
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

		this.projectsTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#home-projects-container',
				start: 'top bottom',
				end: '+=140%',
				pin: false,
				scrub: true,
				ease: 'none',
			},
		})

		this.projectsBottomTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#home-projects-container',
				start: 'bottom bottom',
				end: '+=140%',
				pin: false,
				scrub: true,
				ease: 'none',
			},
		})

		this.ctaTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#cta',
				start: 'top bottom',
				end: '+=140%',
				pin: false,
				scrub: true,
				ease: 'none',
			},
		})

		this.ctaBottomTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#cta',
				start: 'bottom bottom',
				end: '+=140%',
				pin: false,
				scrub: true,
				ease: 'none',
			},
		})

		this.footerTl = gsap.timeline({
			scrollTrigger: {
				trigger: 'footer',
				start: 'top bottom',
				end: 'bottom bottom',
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

		this.projectsTl.to(
			{},
			{
				onUpdate: function () {
					const progress = this.progress()
					const stoneHeight = that.getStoneHeight()
					const frustrumHeight = that.frustrumDimensions.height * 1.5

					const targetY = frustrumHeight
					const totalDistance = targetY

					that.scene.stone.position.y =
						that.initialState.stonePosition.y + totalDistance * progress

					that.scene.overlayPlane.position.y =
						that.initialState.planePosition.y +
						that.frustrumDimensions.height * progress
				},
			}
		)

		this.projectsBottomTl.to(
			{},
			{
				onUpdate: function () {
					const progress = this.progress()
					const stoneHeight = that.getStoneHeight()
					const frustrumHeight = that.frustrumDimensions.height * 1.5

					const startY = -frustrumHeight / 2 - stoneHeight / 2

					const targetY = frustrumHeight

					const totalDistance = targetY

					that.scene.stone.position.y = startY * 1.0 + totalDistance * progress

					that.scene.overlayPlane.position.y =
						that.initialState.planePosition.y -
						that.frustrumDimensions.height +
						that.frustrumDimensions.height * progress
				},
			}
		)

		this.ctaTl.to(
			{},
			{
				onUpdate: function () {
					const progress = this.progress()
					const stoneHeight = that.getStoneHeight()
					const frustrumHeight = that.frustrumDimensions.height * 1.5

					const targetY = frustrumHeight
					const totalDistance = targetY

					that.scene.stone.position.y =
						that.initialState.stonePosition.y + totalDistance * progress

					that.scene.overlayPlane.position.y =
						that.initialState.planePosition.y +
						that.frustrumDimensions.height * progress
				},
			}
		)

		this.ctaBottomTl.to(
			{},
			{
				onUpdate: function () {
					const progress = this.progress()
					const stoneHeight = that.getStoneHeight()
					const frustrumHeight = that.frustrumDimensions.height * 1.5

					const startY = -frustrumHeight / 2 - stoneHeight / 2

					const targetY = frustrumHeight

					const totalDistance = targetY

					that.scene.stone.position.y = startY * 1.0 + totalDistance * progress

					that.scene.overlayPlane.position.y =
						that.initialState.planePosition.y -
						that.frustrumDimensions.height +
						that.frustrumDimensions.height * progress
				},
			}
		)

		this.footerTl.to(
			{},
			{
				onUpdate: function () {
					const progress = this.progress()
					that.scene.logo.position.y =
						that.initialState.logoPosition.y -
						that.frustrumDimensions.height +
						(that.frustrumDimensions.height +
							that.frustrumDimensions.height * 0.07) *
							progress
				},
			}
		)
	}

	getStoneHeight() {
		if (!this.scene.stone || !this.scene.originalStoneDimensions) return 0
		const currentScale = this.scene.stone.scale.x
		return this.scene.originalStoneDimensions.height * currentScale
	}
}

export default HeroScrollTrigger
