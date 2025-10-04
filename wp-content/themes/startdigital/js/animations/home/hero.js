import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)
export default function heroAnimation() {
	const homeHeroTrigger = document.querySelector('#home-hero-trigger')

	return

	let tl

	const paragraphs = homeHeroTrigger.querySelectorAll('.is-h7')

	let paragraphSplit = SplitText.create(paragraphs, {
		type: 'lines',
		mask: 'lines',
		autoSplit: true,
		onSplit: (self) => {
			if (tl) tl.kill()

			tl = gsap.timeline({
				defaults: {
					delay: 0.25,
					duration: 0.65,
					ease: 'power2.out',
				},
			})

			gsap.set(paragraphs, { opacity: 1 })
			gsap.set(self.lines[0], {
				textIndent: '36px',
			})

			tl.fromTo(
				[
					'#home-hero-trigger .supertitle',
					'#home-hero-trigger .icons',
					...self.lines,
					'#home-hero-trigger .btn-container',
				],
				{
					yPercent: 100,
					opacity: 0,
				},
				{
					yPercent: 0,
					opacity: 1,
					stagger: 0.1,
				}
			)
		},
	})
}
