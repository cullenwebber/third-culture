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
			onEnter: () => {
				gsap.to(projectScroller, {
					yPercent: 0,
					y: 0,
					duration: 0.25,
					ease: 'power2.out',
				})
			},
			onLeave: () => {
				gsap.to(projectScroller, {
					yPercent: 100,
					y: 64,
					duration: 0.25,
					ease: 'power2.in',
				})
			},
			onEnterBack: () => {
				gsap.to(projectScroller, {
					yPercent: 0,
					y: 0,
					duration: 0.25,
					ease: 'power2.out',
				})
			},
			onLeaveBack: () => {
				gsap.to(projectScroller, {
					yPercent: 100,
					y: 64,
					duration: 0.25,
					ease: 'power2.in',
				})
			},
		},
	})

	const firstThumbWidth = thumbs[0].getBoundingClientRect().width

	tl.to(slider, {
		left: `calc(100% - ${firstThumbWidth}px)`,
		ease: 'none',
	})
}
