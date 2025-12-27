import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function initCapabilityScroller() {
	const container = document.querySelector('#service-scroll-container')
	const capabilityScroller = document.querySelector('#capability-scroller')
	const sections = document.querySelectorAll('[data-capability-section]')
	const scrollers = document.querySelectorAll('.capability-scroller')

	if (
		sections.length === 0 ||
		scrollers.length === 0 ||
		!capabilityScroller ||
		!container
	) {
		return
	}

	let currentIndex = 0

	// Set initial positions using top instead of yPercent to override CSS
	scrollers.forEach((scroller, i) => {
		gsap.set(scroller, { top: i === 0 ? '0%' : '100%' })
	})

	// Show/hide the entire capability scroller based on service-scroll-container
	ScrollTrigger.create({
		trigger: container,
		start: 'top bottom',
		end: 'bottom bottom',
		onEnter: () => {
			gsap.to(capabilityScroller, {
				yPercent: 0,
				y: 0,
				duration: 0.25,
				ease: 'power2.out',
			})
		},
		onLeave: () => {
			gsap.to(capabilityScroller, {
				yPercent: 100,
				y: 64,
				duration: 0.25,
				ease: 'power2.in',
			})
		},
		onEnterBack: () => {
			gsap.to(capabilityScroller, {
				yPercent: 0,
				y: 0,
				duration: 0.25,
				ease: 'power2.out',
			})
		},
		onLeaveBack: () => {
			gsap.to(capabilityScroller, {
				yPercent: 100,
				y: 64,
				duration: 0.25,
				ease: 'power2.in',
			})
		},
	})

	const transitionTo = (newIndex) => {
		if (
			newIndex === currentIndex ||
			newIndex < 0 ||
			newIndex >= scrollers.length
		) {
			return
		}

		const outgoing = scrollers[currentIndex]
		const incoming = scrollers[newIndex]
		const goingDown = newIndex > currentIndex

		gsap.killTweensOf([outgoing, incoming])

		if (goingDown) {
			gsap.to(outgoing, { top: '-100%', duration: 0.65, ease: 'power2.inOut' })
			gsap.to(incoming, { top: '0%', duration: 0.65, ease: 'power2.inOut' })
		} else {
			gsap.to(outgoing, { top: '100%', duration: 0.65, ease: 'power2.inOut' })
			gsap.to(incoming, { top: '0%', duration: 0.65, ease: 'power2.inOut' })
		}

		currentIndex = newIndex
	}

	sections.forEach((section, index) => {
		ScrollTrigger.create({
			trigger: section,
			start: 'top center',
			end: 'bottom center',
			onEnter: () => {
				transitionTo(index)
			},
			onLeaveBack: () => {
				const prevIndex = index > 0 ? index - 1 : 0
				transitionTo(prevIndex)
			},
		})
	})
}
