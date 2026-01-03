import Lenis from 'lenis'

let lenis = null

export default function initSmoothScrolling() {
	if (lenis) {
		lenis.destroy()
	}
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

export function destroyLenis() {
	if (lenis) {
		lenis.destroy()
		lenis = null
	}
}

export function resetLenisScroll() {
	if (lenis) {
		lenis.scrollTo(0, { immediate: true })
	}
}
