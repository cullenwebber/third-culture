import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { convertIndentToSpan } from '../../utils/utils'

gsap.registerPlugin(SplitText)
export default function projectsAnimation() {
	return
	const homeProjectsTrigger = document.querySelector('#project-grid')

	if (!homeProjectsTrigger) return

	const paragraphs = homeProjectsTrigger.querySelectorAll('.block-content')

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

	const projectTitle = document.querySelector('.project-title')

	if (!projectTitle) return

	let projectSplit = SplitText.create(projectTitle, {
		type: 'chars',
		mask: 'chars',
		autoSplit: true,
		onSplit: (self) => {
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: projectTitle,
					start: 'top bottom',
					toggleActions: 'play none none reverse',
				},
				defaults: {
					delay: 0.15,
					duration: 0.65,
					stagger: 0.025,
					ease: 'power2.out',
				},
			})

			tl.from(self.chars, {
				yPercent: 140,
				rotate: -2,
			})

			const tl2 = gsap.timeline({
				scrollTrigger: {
					trigger: '#project-container-5',
					start: 'top center',
					toggleActions: 'play none none reverse',
				},
				defaults: {
					delay: 0.15,
					duration: 0.55,
					stagger: 0.025,
					ease: 'power2.inOut',
				},
			})

			tl2.to(projectTitle, {
				opacity: 0,
				filter: 'blur(20px)',
			})
		},
	})
}
