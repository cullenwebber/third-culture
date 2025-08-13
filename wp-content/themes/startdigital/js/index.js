import initMenus from './components/menus'
import initSliders from './components/sliders/sliders'
import initAccordions from './components/accordions'
import animateOnScroll from './utils/animate-on-scroll'
import initRemoveLinks from './utils/removeLink'
import initHeaderOnScroll from './utils/headerOnScroll'

document.addEventListener('DOMContentLoaded', () => {
	animateOnScroll()
	initMenus()
	initSliders()
	initAccordions()
	initRemoveLinks()
	initHeaderOnScroll()
})
