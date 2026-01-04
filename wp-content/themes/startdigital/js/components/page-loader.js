import gsap from 'gsap'
import { getLenis } from '../utils/smooth-scroll'
import WebGLManager from '../three/context-manager'

class PageLoader {
	constructor() {
		this.loader = document.querySelector('#page-loader')
		if (!this.loader) return

		this.pageParent = document.querySelector('#page-parent')
		this.innerParent = document.querySelector('#inner-parent')
		this.third = this.loader.querySelector('.third')
		this.culture = this.loader.querySelector('.culture')
		this.digitTracks = this.loader.querySelectorAll('.digit-track')
		this.loaderPercentage = this.loader.querySelector('.loader-percentage')

		this.progress = 0
		this.targetProgress = 0
		this.isComplete = false
		this.isFirstLoad = true
		this.minLoadTime = 1.2
		this.startTime = performance.now()
	}

	animateProgress() {
		if (!this.loader) return

		this.progress = this.targetProgress
		this.updateDigits()
	}

	updateDigits() {
		const percent = Math.round(this.progress * 100)

		const targetPositions = [
			Math.floor(percent / 100),
			Math.floor(percent / 10),
			Math.floor(percent / 10),
		]

		const staggerDelays = [0.5, 0.25, 0]

		this.digitTracks.forEach((track, i) => {
			const numDigits = track.children.length
			const percentPerDigit = 100 / numDigits
			const yPercent = -targetPositions[i] * percentPerDigit

			gsap.to(track, {
				yPercent,
				duration: 1.25,
				delay: staggerDelays[i],
				ease: 'power3.inOut',
				overwrite: true,
			})
		})
	}

	setProgress(value) {
		this.targetProgress = Math.min(Math.max(value, 0), 1)
		this.animateProgress()
	}

	// Initial page load animation (with percentage counter)
	complete() {
		if (!this.loader || this.isComplete) return
		this.isComplete = true

		const elapsed = (performance.now() - this.startTime) / 1000
		const remainingTime = Math.max(0, this.minLoadTime - elapsed)

		this.setProgress(1)

		return new Promise((resolve) => {
			gsap
				.timeline({ delay: remainingTime + 1.0 })
				.to(
					this.third,
					{
						xPercent: -50,
						duration: 0.55,
						ease: 'power4.inOut',
					},
					'<='
				)
				.to(
					this.culture,
					{
						xPercent: 50,
						duration: 0.55,
						ease: 'power4.inOut',
					},
					'<='
				)
				.fromTo(
					this.pageParent,
					{ 'clip-path': 'polygon(45% 50%, 55% 50%, 50% 50%, 50% 50%)' },
					{
						'clip-path': 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
						duration: 0.75,
						ease: 'power3.inOut',
						clearProps: 'all',
						onComplete: () => {
							window.dispatchEvent(new CustomEvent('loaderComplete'))
						},
					},
					'<=20%'
				)
				.call(() => {
					window.dispatchEvent(
						new CustomEvent('layoutTransition', { detail: { active: true } })
					)
				})
				.set(this.pageParent, {
					overflow: 'visible',
					height: 'auto',
				})
				.call(() => {
					requestAnimationFrame(() => {
						window.dispatchEvent(
							new CustomEvent('layoutTransition', {
								detail: { active: false },
							})
						)
					})
				})

				.call(() => {
					this.isFirstLoad = false
					resolve()
				})
		})
	}

	// Animate loader IN (cover the page) - used when leaving a page
	animateIn() {
		if (!this.loader) return Promise.resolve()

		// Reset loader state
		const lenis = getLenis()
		const scrollY = lenis.scroll

		gsap.set(this.third, { xPercent: -50 })
		gsap.set(this.culture, { xPercent: 50 })

		return new Promise((resolve) => {
			gsap
				.timeline()

				.set(this.innerParent, {
					marginTop: -scrollY,
				})
				.set(this.pageParent, {
					overflow: 'hidden',
					height: '100lvh',
					clearProps: 'all',
				})
				.fromTo(
					this.pageParent,
					{
						'clip-path': 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
					},
					{
						'clip-path': 'polygon(50% 50%, 50% 50%, 55% 50%, 45% 50%)',
						duration: 0.85,
						ease: 'power3.inOut',
					}
				)
				// Bring text together
				.to(
					this.third,
					{
						xPercent: 0,
						duration: 0.65,
						ease: 'power4.inOut',
					},
					'<=80%'
				)
				.to(
					this.culture,
					{
						xPercent: 0,
						duration: 0.65,
						ease: 'power4.inOut',
					},
					'<='
				)

				.call(() => resolve())
		})
	}

	// Animate loader OUT (reveal the page) - used when entering a page
	animateOut() {
		if (!this.loader) return Promise.resolve()

		gsap.set(this.third, { xPercent: 0 })
		gsap.set(this.culture, { xPercent: 0 })

		gsap.set(this.pageParent, {
			overflow: 'hidden',
			height: '100lvh',
		})

		return new Promise((resolve) => {
			gsap
				.timeline()
				.set(this.innerParent, {
					marginTop: 0,
					clearProps: 'all',
				})
				.call(() => {
					window.dispatchEvent(new CustomEvent('pageTransitionStart'))
				})
				.to(
					this.third,
					{
						xPercent: -50,
						duration: 0.65,
						ease: 'power4.inOut',
					},
					'<='
				)
				.to(
					this.culture,
					{
						xPercent: 50,
						duration: 0.65,
						ease: 'power4.inOut',
					},
					'<='
				)
				.fromTo(
					this.pageParent,
					{ 'clip-path': 'polygon(45% 50%, 55% 50%, 50% 50%, 50% 50%)' },
					{
						'clip-path': 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
						duration: 0.95,
						ease: 'power3.inOut',
					},
					'<=30%'
				)
				.call(() => {
					window.dispatchEvent(
						new CustomEvent('layoutTransition', { detail: { active: true } })
					)
				})
				.set(this.pageParent, {
					overflow: 'visible',
					height: 'auto',
				})
				.call(() => {
					requestAnimationFrame(() => {
						window.dispatchEvent(
							new CustomEvent('layoutTransition', {
								detail: { active: false },
							})
						)
					})
				})
				.call(() => resolve())
		})
	}
}

let loaderInstance = null

export function initPageLoader() {
	const loader = document.querySelector('#page-loader')
	if (!loader) return null

	loaderInstance = new PageLoader()
	return loaderInstance
}

export function getPageLoader() {
	return loaderInstance
}

export default PageLoader
