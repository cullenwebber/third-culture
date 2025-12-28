import Lenis from 'lenis'

let lenis = null

export default function initSmoothScrolling() {
	lenis = new Lenis({
		lerp: 0.1,
		autoRaf: true,
		syncTouch: true,
		virtualScroll: true,
	})
}

export function getLenis() {
	if (!lenis) return
	return lenis
}
