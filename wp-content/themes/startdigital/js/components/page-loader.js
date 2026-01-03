import gsap from 'gsap'

class PageLoader {
	constructor() {
		this.loader = document.querySelector('#page-loader')
		if (!this.loader) return

		this.digitTracks = this.loader.querySelectorAll('.digit-track')
		this.loaderPercentage = this.loader.querySelector('.loader-percentage')
		this.progress = 0
		this.targetProgress = 0
		this.isComplete = false
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

		// Target positions for final display: 1, 0, 0
		const targetPositions = [
			Math.floor(percent / 100), // hundreds: ends at 1
			Math.floor(percent / 10), // tens: scrolls through 0-10
			Math.floor(percent / 10), // tens: scrolls through 0-10
		]

		// Stagger delays: last digit first, then middle, then first
		const staggerDelays = [0.5, 0.25, 0] // hundreds, tens, ones

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

	complete() {
		if (!this.loader || this.isComplete) return
		this.isComplete = true

		const elapsed = (performance.now() - this.startTime) / 1000
		const remainingTime = Math.max(0, this.minLoadTime - elapsed)

		this.setProgress(1)

		const pixels = this.loader.querySelectorAll('.pixel')

		gsap
			.timeline({ delay: remainingTime + 1.0 })
			.to('.digit-track', {
				xPercent: 100,
				duration: 0.5,
				ease: 'power2.in',
			})
			.set('#page-loader', {
				background: 'transparent',
			})
			.to(pixels, {
				yPercent: -100,
				duration: 0.5,
				stagger: {
					amount: 1.0,
					from: 'start',
				},
				onComplete: () => {
					this.loader.remove()
					window.dispatchEvent(new CustomEvent('loaderComplete'))
				},
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
