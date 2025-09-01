import initMenus from './components/menus'
import initHeaderOnScroll from './utils/headerOnScroll'
import initHomeThree from './three/home/three-home'
import initSmoothScrolling from './utils/smooth-scroll'
import initNewsSwiper from './components/news-slider'

document.addEventListener('DOMContentLoaded', () => {
	initSmoothScrolling()
	initMenus()
	initHeaderOnScroll()
	initHomeThree()
	initNewsSwiper()
})
