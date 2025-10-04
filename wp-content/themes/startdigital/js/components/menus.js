import gsap from 'gsap'

export default function initMenus() {
	toggleMenu()
}

// Initialize menu state
let isMenuOpen = false

function toggleMenu() {
	const menu = document.querySelector('[data-menu]')
	const button = document.querySelector('[data-menu-button]')
	const lines = button.querySelectorAll('.lines')

	button.addEventListener('click', (e) => {
		e.stopPropagation() // Prevent this click from triggering document listener
		handleMenuToggle(menu, lines)
	})

	// Close menu when clicking outside
	document.addEventListener('click', (e) => {
		// Check if menu is open and click is outside both menu and button
		if (isMenuOpen && !menu.contains(e.target) && !button.contains(e.target)) {
			handleMenuToggle(menu, lines)
		}
	})

	gsap.set('.nav-menu-items', {
		yPercent: 100,
	})
}

const handleMenuToggle = (menu, lines) => {
	if (!isMenuOpen) {
		const nav = menu.querySelector('nav')
		const targetHeight = nav.scrollHeight

		gsap.to(menu, {
			height: targetHeight,
			duration: 1.0,
			ease: 'power4.inOut',
		})

		gsap.to('.nav-menu-items', {
			yPercent: 0,
			stagger: 0.075,
			delay: 0.4,
			duration: 0.45,
			ease: 'power2.out',
		})

		gsap.to(lines[0], { y: '4px', duration: 0.4 })
		gsap.to(lines[2], { y: '-4px', duration: 0.4 })
	} else {
		// Close menu
		gsap.to(menu, {
			height: 0,
			duration: 1.0,
			ease: 'power4.inOut',
		})

		gsap.to('.nav-menu-items', {
			yPercent: 100,
			stagger: {
				from: 'end',
				each: 0.075,
			},
			duration: 0.45,
			ease: 'power2.in',
		})

		gsap.to(lines[0], { y: 0, duration: 0.4 })
		gsap.to(lines[2], { y: 0, duration: 0.4 })
	}

	isMenuOpen = !isMenuOpen
}
