import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

export default function initMenus() {
	toggleMenu()
}

// Initialize menu state
let isMenuOpen = false
let tl = null

function toggleMenu() {
	const menu = document.querySelector('[data-menu]')
	const button = document.querySelector('[data-menu-button]')

	if (!button) return

	const nav = menu.querySelector('nav')
	const targetHeight = nav.scrollHeight
	const texts = document.querySelectorAll('.menu__button-text')

	tl = gsap.timeline({ paused: true })

	// Menu container and background
	tl.to(
		menu,
		{
			height: targetHeight,
			duration: 1.0,
			ease: 'power4.inOut',
		},
		0
	)

	tl.to(
		'.menu-background',
		{
			height: '100%',
			duration: 1.0,
			ease: 'power4.inOut',
		},
		0
	)

	// Menu icon
	tl.to(
		'.menu-icon',
		{
			y: 0,
			duration: 0.45,
			ease: 'power2.out',
		},
		0
	)

	// Nav menu items
	tl.fromTo(
		'.nav-menu-items',
		{
			yPercent: 100,
		},
		{
			yPercent: 0,
			stagger: 0.075,
			duration: 0.45,
			ease: 'power2.out',
		},
		0.4
	)

	// Button rotation
	tl.to(
		'.menu-button-swap',
		{
			rotate: 90,
			duration: 0.45,
			ease: 'power2.out',
		},
		0
	)

	// Button text splits
	SplitText.create(texts[0], {
		type: 'chars',
		autoSplit: true,
		onSplit: (self) => {
			tl.to(
				self.chars,
				{
					yPercent: -100,
					stagger: 0.01,
					duration: 0.45,
					ease: 'power2.inOut',
				},
				0
			)
		},
	})

	SplitText.create(texts[1], {
		type: 'chars',
		autoSplit: true,
		onSplit: (self) => {
			tl.to(
				self.chars,
				{
					yPercent: -100,
					stagger: 0.01,
					duration: 0.45,
					ease: 'power2.inOut',
				},
				0
			)
		},
	})

	button.addEventListener('click', (e) => {
		e.stopPropagation()
		handleMenuToggle()
	})

	// Close menu when clicking outside
	document.addEventListener('click', (e) => {
		if (isMenuOpen && !menu.contains(e.target) && !button.contains(e.target)) {
			handleMenuToggle()
		}
	})
}

const handleMenuToggle = () => {
	if (!isMenuOpen) {
		tl.play()
	} else {
		tl.reverse()
	}
	isMenuOpen = !isMenuOpen
}
