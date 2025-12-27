import gsap from 'gsap'

export default function initMouseFollower() {
	const mouseEl = document.querySelector('#mouse-follower')

	if (!mouseEl) return

	const dataSpan = document.querySelector('[data-mouse-coordinates]')

	gsap.set(mouseEl, { xPercent: -50, yPercent: -50 })

	let xTo = gsap.quickTo(mouseEl, 'x', { duration: 0.6, ease: 'power3' }),
		yTo = gsap.quickTo(mouseEl, 'y', { duration: 0.6, ease: 'power3' })

	window.addEventListener('mousemove', (e) => {
		xTo(e.clientX)
		yTo(e.clientY)

		if (dataSpan)
			dataSpan.textContent = `${
				Math.round((e.clientX / window.innerWidth) * 100) / 100
			}, ${Math.round((e.clientY / window.innerHeight) * 100) / 100}`
	})

	const innerEls = mouseEl.querySelectorAll('div')
	const tl = gsap
		.timeline({
			defaults: {
				duration: 0.25,
				ease: 'power2.inOut',
			},
		})
		.pause()
		.to(innerEls[0], {
			top: 12,
			left: 12,
		})
		.to(
			innerEls[1],
			{
				top: 12,
				right: 12,
			},
			'<='
		)
		.to(
			innerEls[2],
			{
				bottom: 12,
				right: 12,
			},
			'<='
		)
		.to(
			innerEls[3],
			{
				bottom: 12,
				left: 12,
			},
			'<='
		)

	window.addEventListener('mousedown', () => {
		tl.play()
	})
	window.addEventListener('mouseup', () => {
		tl.reverse()
	})
}
