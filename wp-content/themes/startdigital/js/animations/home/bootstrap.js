import aboutAnimation from './about'
import capabilitiesAnimation from './capabilities'
import heroAnimation from './hero'
import newsAnimation from './news'

export default function homeAnimationBootstrap() {
	heroAnimation()
	aboutAnimation()
	capabilitiesAnimation()
	newsAnimation()
}

export function destroyHomeAnimations() {
	// GSAP animations and ScrollTriggers are cleaned up globally by app-lifecycle
}
