import Lenis from 'lenis'

let lenis = null

export default function initSmoothScrolling() {
	lenis = new Lenis({
		autoRaf: true,
	})
}

export function getLenis() {
	if (!lenis) return
	return lenis
}
