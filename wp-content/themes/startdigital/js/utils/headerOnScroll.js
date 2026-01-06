import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let scrollTriggers = []

/**
 * Adds 'header-scrolling' class to header element when user scrolls past 100px from top
 * Removes class when scrolling back up
 *
 * Also adds 'header-inverted' class when viewport top enters sections with '.dark-header' class
 *
 * @returns {void}
 * @requires ScrollTrigger
 *
 */
export default function initHeaderOnScroll() {
	scrollTriggers = []
	const header = document.querySelector('header')
	if (!header) return

	const st = ScrollTrigger.create({
		start: '100px top',
		onEnter: () => header.classList.add('header-scrolling'),
		onLeaveBack: () => header.classList.remove('header-scrolling'),
	})
	scrollTriggers.push(st)

	initDarkHeaderTriggers(header)
}

export function destroyHeaderOnScroll() {
	scrollTriggers.forEach(st => st.kill())
	scrollTriggers = []
	const header = document.querySelector('header')
	if (header) {
		header.classList.remove('header-scrolling', 'header-inverted', 'dark-mouse')
	}
}

function initDarkHeaderTriggers(header) {
	const darkSections = document.querySelectorAll('.dark-header')
	if (!darkSections.length) return

	const setDarkHeader = (isDark) => {
		if (isDark) {
			header.classList.add('header-inverted', 'dark-mouse')
		} else {
			header.classList.remove('header-inverted', 'dark-mouse')
		}
		window.dispatchEvent(
			new CustomEvent('headerDarkChange', { detail: { isDark } })
		)
	}

	darkSections.forEach((section) => {
		const st = ScrollTrigger.create({
			trigger: section,
			start: 'top top+=64px',
			end: 'bottom top+=64px',
			onEnter: () => setDarkHeader(true),
			onLeave: () => setDarkHeader(false),
			onEnterBack: () => setDarkHeader(true),
			onLeaveBack: () => setDarkHeader(false),
		})
		scrollTriggers.push(st)
	})
}
