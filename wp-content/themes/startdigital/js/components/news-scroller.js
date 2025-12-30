import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function initNewsScroller() {
	const container = document.querySelector('#news-scene-wrapper')
	const newsScroller = document.querySelector('#news-scroller')
	const slider = newsScroller?.querySelector('[data-project-slider]')
	const thumbs = newsScroller?.querySelectorAll('[data-project-thumb]')

	if (
		!container ||
		!newsScroller ||
		!slider ||
		!thumbs ||
		thumbs.length === 0
	) {
		return
	}

	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: container,
			start: 'top top',
			end: 'bottom bottom',
			scrub: true,
			ease: 'none',
			pin: newsScroller,
			pinSpacing: false,
		},
	})

	const firstThumbWidth = thumbs[0].getBoundingClientRect().width

	tl.to(slider, {
		left: `calc(100% - ${firstThumbWidth}px)`,
		ease: 'none',
	})
}
