import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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
			pin: projectScroller,
			pinSpacing: false,
		},
	})

	const firstThumbWidth = thumbs[0].getBoundingClientRect().width

	tl.to(slider, {
		left: `calc(100% - ${firstThumbWidth}px)`,
		ease: 'none',
	})
}
