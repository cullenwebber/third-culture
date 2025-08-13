import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Adds 'header-scrolling' class to header element when user scrolls past 100px from top
 * Removes class when scrolling back up
 *
 * @returns {void}
 * @requires ScrollTrigger
 *
 */
export default function initHeaderOnScroll() {
	const header = document.querySelector('header')
	if (!header) return

	ScrollTrigger.create({
		start: '100px top',
		onEnter: () => header.classList.add('header-scrolling'),
		onLeaveBack: () => header.classList.remove('header-scrolling'),
	})
}
