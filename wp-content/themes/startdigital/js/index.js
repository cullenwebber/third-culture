import initMenus from './components/menus'
import initHeaderOnScroll from './utils/headerOnScroll'
import initSmoothScrolling from './utils/smooth-scroll'
import homeAnimationBootstrap from './animations/home/bootstrap'
import buttonAnimations from './animations/buttonAnimation'
import initThree from './three/init-three'
import initNewsSwiper from './components/news-slider'

document.addEventListener('DOMContentLoaded', () => {
	initSmoothScrolling()
	initMenus()
	initHeaderOnScroll()
	homeAnimationBootstrap()
	buttonAnimations()
	initThree()
	initNewsSwiper()
})
