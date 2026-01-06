import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function destroyProjectScroller() {
	// ScrollTriggers are cleaned up globally by app-lifecycle
}

export default function initProjectScroller() {
	const container = document.querySelector('#home-projects-inner')
	const projectScroller = document.querySelector('#project-scroller')
	const slider = document.querySelector('[data-project-slider]')
	const thumbs = document.querySelectorAll('[data-project-thumb]')

	if (!container || !projectScroller || !slider || thumbs.length === 0) {
		return
	}

	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: container,
			start: 'top top',
			end: 'bottom bottom',
			scrub: true,
			ease: 'none',
			pin: false,
		},
	})

	const firstThumbWidth = thumbs[0].getBoundingClientRect().width

	tl.to(slider, {
		left: `calc(100% - ${firstThumbWidth}px)`,
		ease: 'none',
	})
}
