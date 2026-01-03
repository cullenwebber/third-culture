import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class ScrollProgress {
	constructor(options = {}) {
		this.position = options.position ?? 'right'
		this.width = 8
		this.backgroundColor = '#02001B'
		this.progressColor = options.progressColor ?? '#ffffff'
		this.offset = options.offset ?? 20
		this.zIndex = options.zIndex ?? 9999

		this.hideNativeScrollbar()
		this.createElements()
		this.setupScrollTrigger()
	}

	hideNativeScrollbar() {
		const style = document.createElement('style')
		style.textContent = `
			html, body {
				scrollbar-width: none;
				-ms-overflow-style: none;
				overflow-x: hidden;
			}
			html::-webkit-scrollbar,
			body::-webkit-scrollbar {
				width: 0;
				height: 0;
				display: none;
			}
			body {
				overflow-y: scroll;
			}
		`
		document.head.appendChild(style)
	}

	createElements() {
		// Create container
		this.container = document.createElement('div')
		this.container.className = 'scroll-progress'
		Object.assign(this.container.style, {
			position: 'fixed',
			top: '50%',
			transform: 'translateY(-50%)',
			padding: '2px',
			borderRadius: '99px',
			[this.position]: `${this.offset}px`,
			width: `${this.width}px`,
			height: '125px',
			backgroundColor: this.backgroundColor,
			zIndex: this.zIndex,
			pointerEvents: 'none',
			overflow: 'hidden',
		})

		// Create progress bar
		this.bar = document.createElement('div')
		this.bar.className = 'scroll-progress__bar'
		Object.assign(this.bar.style, {
			position: 'absolute',
			top: '2px',
			left: '2px',
			right: '2px',
			borderRadius: '99px',
			height: '30%',
			backgroundColor: this.progressColor,
		})

		this.container.appendChild(this.bar)
		document.body.appendChild(this.container)

		// Calculate the travel distance (container height - bar height - padding)
		this.containerHeight = 125
		this.barHeight = this.containerHeight * 0.3 // 30% of container
		this.padding = 4 // 2px padding on each side
		this.maxTravel = this.containerHeight - this.barHeight - this.padding
	}

	setupScrollTrigger() {
		this.scrollTrigger = ScrollTrigger.create({
			trigger: document.documentElement,
			start: 'top top',
			end: 'bottom bottom',
			scrub: true,
			onUpdate: (self) => {
				const yPos = self.progress * this.maxTravel
				gsap.set(this.bar, {
					y: yPos,
				})
			},
		})
	}

	setProgressColor(color) {
		gsap.to(this.bar, {
			backgroundColor: color,
			duration: 0.3,
		})
	}

	setBackgroundColor(color) {
		gsap.to(this.container, {
			backgroundColor: color,
			duration: 0.3,
		})
	}

	show() {
		gsap.to(this.container, {
			autoAlpha: 1,
			duration: 0.3,
		})
	}

	hide() {
		gsap.to(this.container, {
			autoAlpha: 0,
			duration: 0.3,
		})
	}

	destroy() {
		if (this.scrollTrigger) {
			this.scrollTrigger.kill()
		}
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container)
		}
	}
}

export default ScrollProgress
