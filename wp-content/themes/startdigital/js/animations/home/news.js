import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { convertIndentToSpan } from '../../utils/utils'

gsap.registerPlugin(SplitText)
export default function newsAnimation() {
	const homeNewsTrigger = document.querySelector('#home-news-trigger')

	if (!homeNewsTrigger) return

	const paragraphs = homeNewsTrigger.querySelectorAll('.block-content')

	paragraphs.forEach((blockContent) => {
		const p = blockContent.querySelectorAll(
			':scope > *:is(h1,h2,h3,h4,h5,h6, .is-h7, p)'
		)

		p.forEach((p1) => {
			convertIndentToSpan(p1)
		})

		const splitType = blockContent.getAttribute('split-type') ?? 'lines'

		let paragraphSplit = SplitText.create(p, {
			type: splitType,
			mask: splitType,
			autoSplit: true,
			onSplit: (self) => {
				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: p,
						start: 'top bottom',
						toggleActions: 'play none none reverse',
					},
					defaults: {
						delay: 0.15,
						duration: 0.65,
						stagger: splitType == 'chars' ? 0.025 : 0.1,
						ease: 'power2.out',
					},
				})

				tl.from(self[splitType] || self.lines, {
					yPercent: 140,
					rotate: -2,
				})
			},
		})
	})

	const newsTl = gsap.timeline({
		scrollTrigger: {
			trigger: '#home-swiper-trigger',
			start: 'top bottom',
			toggleActions: 'play none none reverse',
		},
		defaults: {
			delay: 0.15,
			duration: 0.65,
			stagger: 0.15,
			ease: 'power2.out',
		},
	})

	newsTl.from('#home-swiper-trigger .post-tease > *', {
		y: 100,
		opacity: 0,
	})
}
