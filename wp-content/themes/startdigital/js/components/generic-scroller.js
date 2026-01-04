import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let st = []

export default function genericScroller() {
	const containers = document.querySelectorAll('.sticky')

	if (!containers.length > 0) return

	containers.forEach((c, i) => {
		const p = c.parentElement
		const t = ScrollTrigger.create({
			trigger: p,
			start: 'top top',
			end: 'bottom bottom',
			pin: c,
			pinSpacing: false,
		})

		st.push(t)
	})
}

export function killGenericScroller() {
	if (!st.length > 0) return

	st.forEach((t) => t.kill())
}
