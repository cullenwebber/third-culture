import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

let buttonData = []

export default function buttonAnimations() {
	buttonData = []
	const buttons = document.querySelectorAll('.button__large, .button__small')

	if (buttons.length === 0) return

	buttons.forEach((button) => {
		const texts = button.querySelectorAll('.button__text')

		let tl = gsap.timeline({ paused: true })

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

		const enterHandler = () => tl.play()
		const leaveHandler = () => tl.reverse()

		button.addEventListener('mouseenter', enterHandler)
		button.addEventListener('mouseleave', leaveHandler)

		buttonData.push({ button, tl, topSplit, bottomSplit, enterHandler, leaveHandler })
	})
}

export function destroyButtonAnimations() {
	buttonData.forEach(({ button, tl, topSplit, bottomSplit, enterHandler, leaveHandler }) => {
		button.removeEventListener('mouseenter', enterHandler)
		button.removeEventListener('mouseleave', leaveHandler)
		tl.kill()
		topSplit?.revert()
		bottomSplit?.revert()
	})
	buttonData = []
}
