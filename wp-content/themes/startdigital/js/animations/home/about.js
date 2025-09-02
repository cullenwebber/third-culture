import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { convertIndentToSpan } from '../../utils/utils'

gsap.registerPlugin(SplitText)
export default function aboutAnimation() {
	const homeAboutTrigger = document.querySelector('#home-about-trigger')

	if (!homeAboutTrigger) return

	const paragraphs = homeAboutTrigger.querySelectorAll('.block-content')

	paragraphs.forEach((blockContent) => {
		const p = blockContent.querySelectorAll(
			':scope > *:is(h1,h2,h3,h4,h5,h6, .is-h7, p)'
		)

		p.forEach((p1) => {
			convertIndentToSpan(p1)
		})

		let paragraphSplit = SplitText.create(p, {
			type: 'lines',
			mask: 'lines',
			autoSplit: true,
			onSplit: (self) => {
				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: p,
						start: 'top bottom',
						toggleActions: 'play none none reverse',
					},
					defaults: {
						delay: 0.25,
						duration: 0.65,
						stagger: 0.1,
						ease: 'power2.out',
					},
				})

				tl.from(self.lines, {
					yPercent: 140,
					rotate: -2,
				})
			},
		})
	})
}
