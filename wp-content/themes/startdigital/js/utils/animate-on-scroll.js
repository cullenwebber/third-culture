import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function animateOnScroll() {
	// ELEMENT SELECTORS ANIMATE
	const elementsFade = document.querySelectorAll('[data-fade]')

	// ELEMENT SELECTOR ANIMATE CHILDREN
	const elementsStagger = document.querySelectorAll('[data-stagger]')

	// FADE ANIMATION ----------------------------
	elementsFade.forEach((element) => {
		const fadeType = element.getAttribute('data-fade')

		const directionMap = {
			up: { y: 16 },
			down: { y: -16 },
			left: { x: 16 },
			right: { x: -16 },
		}

		const fadeDirection = directionMap[fadeType] || {}

		const settings = {
			scrollTrigger: {
				trigger: element,
				start: 'top bottom-=10%',
			},
			autoAlpha: 0,
			delay: 0.2,
			duration: 0.6,
			...fadeDirection,
		}

		gsap.from(element, settings)
	})

	// STAGGER ANIMATIONS -----------------------
	elementsStagger.forEach((stagger) => {
		const staggerType = stagger.getAttribute('data-stagger')

		const directionMap = {
			up: { y: 20 },
			down: { y: -20 },
			left: { x: 20 },
			right: { x: -20 },
		}

		const staggerDirection = directionMap[staggerType] || {}

		const elementsStagger = gsap.utils.toArray(stagger.children)

		gsap.from(elementsStagger, {
			scrollTrigger: {
				trigger: stagger,
				start: 'top bottom-=10%',
			},
			autoAlpha: 0,
			delay: 0.2,
			stagger: 0.15,
			...staggerDirection,
		})
	})
}
