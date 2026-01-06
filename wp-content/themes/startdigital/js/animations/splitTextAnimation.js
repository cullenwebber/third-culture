import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

let splitInstances = []
let timelines = []

export default function splitTextAnimation() {
	const triggers = document.querySelectorAll('.split-text-trigger')

	if (!triggers.length > 0) return

	triggers.forEach((t) => {
		const blockContentItems = t.querySelectorAll(' h1, h2, h3, h4, h5, h6, p')

		const tl = gsap.timeline({
			delay: 0.25,
			scrollTrigger: {
				trigger: t,
				start: 'top+=45% bottom',
				toggleActions: 'play none none reverse',
			},
			defaults: {
				duration: 0.65,
				stagger: 0.1,
				ease: 'power2.out',
			},
		})

		timelines.push(tl)

		// Fade up button and supertitle wrappers (no text split)
		let supertitle = t.querySelectorAll('.supertitle-wrapper')
		if (supertitle.length > 0) {
			tl.from(
				supertitle,
				{
					yPercent: 100,
					opacity: 0,
				},
				'<='
			)
		}

		blockContentItems.forEach((p) => {
			const splitType = p.getAttribute('split-type') ?? 'lines'
			const split = SplitText.create(p, {
				type: splitType,
				mask: splitType,
				autoSplit: true,
				onSplit: (self) => {
					tl.from(
						self[splitType] || self.lines,
						{
							yPercent: 100,
						},
						'<='
					)
				},
			})

			splitInstances.push(split)
		})

		// Fade up button and supertitle wrappers (no text split)
		const fadeUpItems = t.querySelectorAll('.button-wrapper')
		if (fadeUpItems.length > 0) {
			tl.from(
				fadeUpItems,
				{
					yPercent: 100,
					opacity: 0,
				},
				'<='
			)
		}
	})
}

export function destroySplitTextAnimation() {
	// Kill all timelines and their ScrollTriggers
	timelines.forEach((tl) => {
		tl.scrollTrigger?.kill()
		tl.kill()
	})
	timelines = []

	// Revert all SplitText instances (restores original HTML)
	splitInstances.forEach((split) => {
		split.revert()
	})
	splitInstances = []
}
