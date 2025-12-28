import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

export default function buttonAnimations() {
	const buttons = document.querySelectorAll('.button__large, .button__small')

	if (buttons.length === 0) return

	buttons.forEach((button) => {
		const texts = button.querySelectorAll('.button__text')
		const lines = button.querySelectorAll('.button__lines div')

		let tl
		tl = gsap.timeline({ paused: true })

		let topSplit = SplitText.create(texts[0], {
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
					'<='
				)
			},
		})
		let bottomSplit = SplitText.create(texts[1], {
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
					'<='
				)
			},
		})

		button.addEventListener('mouseenter', () => tl.play())
		button.addEventListener('mouseleave', () => tl.reverse())
	})
}
