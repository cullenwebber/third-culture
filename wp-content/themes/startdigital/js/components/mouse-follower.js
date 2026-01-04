import gsap from 'gsap'
import { isTouchDevice } from '../utils/device-capability'

let cleanupFns = []

export default function initMouseFollower() {
	cleanupFns = []
	const mouseEl = document.querySelector('#mouse-follower')

	if (!mouseEl) return

	// Remove mouse follower on touch devices
	if (isTouchDevice()) {
		mouseEl.remove()
		return
	}

	const dataSpan = document.querySelector('[data-mouse-coordinates]')

	gsap.set(mouseEl, { xPercent: -50, yPercent: -50 })

	let xTo = gsap.quickTo(mouseEl, 'x', { duration: 0.6, ease: 'power3' }),
		yTo = gsap.quickTo(mouseEl, 'y', { duration: 0.6, ease: 'power3' })

	const innerEls = mouseEl.querySelectorAll('div')

	// Track current state
	let isOnButton = false
	let currentButton = null
	let mouseX = 0
	let mouseY = 0

	// Magnetic strength (how much the follower is pulled toward button center)
	const magnetStrength = 0.6

	const mouseMoveHandler = (e) => {
		mouseX = e.clientX
		mouseY = e.clientY

		if (isOnButton && currentButton) {
			// Magnetize toward button center
			const rect = currentButton.getBoundingClientRect()
			const buttonCenterX = rect.left + rect.width / 2
			const buttonCenterY = rect.top + rect.height / 2

			const magnetX = mouseX + (buttonCenterX - mouseX) * magnetStrength
			const magnetY = mouseY + (buttonCenterY - mouseY) * magnetStrength

			xTo(magnetX)
			yTo(magnetY)
		} else {
			xTo(mouseX)
			yTo(mouseY)
		}

		if (dataSpan)
			dataSpan.textContent = `${
				Math.round((e.clientX / window.innerWidth) * 100) / 100
			}, ${Math.round((e.clientY / window.innerHeight) * 100) / 100}`
	}
	window.addEventListener('mousemove', mouseMoveHandler)
	cleanupFns.push(() => window.removeEventListener('mousemove', mouseMoveHandler))

	// Click animation timeline
	const clickTl = gsap
		.timeline({
			defaults: {
				duration: 0.25,
				ease: 'power2.inOut',
			},
		})
		.pause()
		.to(innerEls[0], {
			top: 12,
			left: 12,
		})
		.to(
			innerEls[1],
			{
				top: 12,
				right: 12,
			},
			'<='
		)
		.to(
			innerEls[2],
			{
				bottom: 12,
				right: 12,
			},
			'<='
		)
		.to(
			innerEls[3],
			{
				bottom: 12,
				left: 12,
			},
			'<='
		)

	// window.addEventListener('mousedown', () => {
	// 	clickTl.play()
	// })
	// window.addEventListener('mouseup', () => {
	// 	clickTl.reverse()
	// })

	// Button hover effect - expand corners to button edges
	const buttons = document.querySelectorAll(
		'.button__small, .menu__button, .nav-menu-items, .logo-hover'
	)

	buttons.forEach((button) => {
		button.addEventListener('mouseenter', () => {
			isOnButton = true
			currentButton = button

			const rect = button.getBoundingClientRect()
			const halfWidth = rect.width / 2
			const halfHeight = rect.height / 2

			// Expand corners to match button dimensions
			gsap.to(innerEls[0], {
				top: -halfHeight,
				left: -halfWidth,
				duration: 0.3,
				ease: 'power2.out',
			})
			gsap.to(innerEls[1], {
				top: -halfHeight,
				right: -halfWidth,
				duration: 0.3,
				ease: 'power2.out',
			})
			gsap.to(innerEls[2], {
				bottom: -halfHeight,
				right: -halfWidth,
				duration: 0.3,
				ease: 'power2.out',
			})
			gsap.to(innerEls[3], {
				bottom: -halfHeight,
				left: -halfWidth,
				duration: 0.3,
				ease: 'power2.out',
			})

			// Move coordinates out
			if (dataSpan) {
				gsap.to(dataSpan, {
					y: halfHeight + 16,
					duration: 0.3,
					ease: 'power2.out',
				})
			}
		})

		button.addEventListener('mouseleave', () => {
			isOnButton = false
			currentButton = null

			// Reset corners to default position
			gsap.to(innerEls[0], {
				top: 0,
				left: 0,
				duration: 0.3,
				ease: 'power2.out',
			})
			gsap.to(innerEls[1], {
				top: 0,
				right: 0,
				duration: 0.3,
				ease: 'power2.out',
			})
			gsap.to(innerEls[2], {
				bottom: 0,
				right: 0,
				duration: 0.3,
				ease: 'power2.out',
			})
			gsap.to(innerEls[3], {
				bottom: 0,
				left: 0,
				duration: 0.3,
				ease: 'power2.out',
			})

			// Reset coordinates position
			if (dataSpan) {
				gsap.to(dataSpan, {
					y: 0,
					duration: 0.3,
					ease: 'power2.out',
				})
			}
		})
	})

	// Dark mouse color change
	const darkMouseEls = document.querySelectorAll('.dark-mouse')
	const defaultColor = '#ffffff'
	const darkColor = '#02001b'

	const setMouseColor = (isDark) => {
		gsap.to(innerEls, {
			borderColor: isDark ? darkColor : defaultColor,
			duration: 0.3,
			ease: 'power2.out',
		})
		if (dataSpan) {
			gsap.to(dataSpan, {
				color: isDark ? darkColor : defaultColor,
				duration: 0.3,
				ease: 'power2.out',
			})
		}
	}

	darkMouseEls.forEach((el) => {
		el.addEventListener('mouseenter', () => setMouseColor(true))
		el.addEventListener('mouseleave', () => setMouseColor(false))
	})

	// Listen for header dark state changes
	const header = document.querySelector('header')
	let isMouseOverHeader = false

	if (header) {
		header.addEventListener('mouseenter', () => {
			isMouseOverHeader = true
			if (header.classList.contains('dark-mouse')) {
				setMouseColor(true)
			}
		})
		header.addEventListener('mouseleave', () => {
			isMouseOverHeader = false
			if (header.classList.contains('dark-mouse')) {
				setMouseColor(false)
			}
		})

		window.addEventListener('headerDarkChange', (e) => {
			if (isMouseOverHeader) {
				setMouseColor(e.detail.isDark)
			}
		})
	}

	// Post tease - force white, then back to dark on leave
	const postTeaseEls = document.querySelectorAll('.post-tease')

	postTeaseEls.forEach((el) => {
		el.addEventListener('mouseenter', () => {
			gsap.to(innerEls, {
				borderColor: defaultColor,
				duration: 0.3,
				ease: 'power2.out',
			})
			if (dataSpan) {
				gsap.to(dataSpan, {
					color: defaultColor,
					duration: 0.3,
					ease: 'power2.out',
				})
			}
		})

		el.addEventListener('mouseleave', () => {
			gsap.to(innerEls, {
				borderColor: darkColor,
				duration: 0.3,
				ease: 'power2.out',
			})
			if (dataSpan) {
				gsap.to(dataSpan, {
					color: darkColor,
					duration: 0.3,
					ease: 'power2.out',
				})
			}
		})
	})
}

export function destroyMouseFollower() {
	cleanupFns.forEach(fn => fn())
	cleanupFns = []
}
