import initMenus from './components/menus'
import initHeaderOnScroll from './utils/headerOnScroll'
import initHomeThree from './three/home/three-home'
import initSmoothScrolling from './utils/smooth-scroll'
import initNewsSwiper from './components/news-slider'
import homeAnimationBootstrap from './animations/home/bootstrap'

document.addEventListener('DOMContentLoaded', () => {
	initSmoothScrolling()
	initMenus()
	initHeaderOnScroll()
	homeAnimationBootstrap()
	initHomeThree()
	initNewsSwiper()
})
