import aboutAnimation from './about'
import capabilitiesAnimation from './capabilities'
import heroAnimation from './hero'
import newsAnimation from './news'
import projectsAnimation from './projects'

export default function homeAnimationBootstrap() {
	heroAnimation()
	aboutAnimation()
	capabilitiesAnimation()
	projectsAnimation()
	newsAnimation()
}
