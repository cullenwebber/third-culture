import Lenis from 'lenis'

let lenis = null

export default function initSmoothScrolling() {
	lenis = new Lenis({
		lerp: 0.1,
		autoRaf: true,
		syncTouch: true,
		syncTouchLerp: 0.075,
		// touchMultiplier: 1.2,
	})
}

export function getLenis() {
	if (!lenis) return
	return lenis
}
