import initMenus from './components/menus'
import initHeaderOnScroll from './utils/headerOnScroll'
import initHomeThree from './three/home/three-home'
import initSmoothScrolling from './utils/smooth-scroll'

document.addEventListener('DOMContentLoaded', () => {
	initSmoothScrolling()
	initMenus()
	initHeaderOnScroll()
	initHomeThree()
})
