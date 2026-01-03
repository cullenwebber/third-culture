import initMenus from './components/menus'
import initHeaderOnScroll from './utils/headerOnScroll'
import initSmoothScrolling from './utils/smooth-scroll'
import homeAnimationBootstrap from './animations/home/bootstrap'
import buttonAnimations from './animations/buttonAnimation'
import initThree, { setLoadingProgressCallback } from './three/init-three'
import initNewsSwiper from './components/news-slider'
import initMouseFollower from './components/mouse-follower'
import initCapabilityScroller from './components/capability-scroller'
import initProjectScroller from './components/project-scroller'
import initNewsScroller from './components/news-scroller'
import ScrollProgress from './components/scroll-progress'
import { initPageLoader, getPageLoader } from './components/page-loader'

document.addEventListener('DOMContentLoaded', async () => {
	// Initialize loader first (only on homepage)
	const loader = initPageLoader()

	// Set up progress callback for Three.js loading
	if (loader) {
		setLoadingProgressCallback((progress) => {
			loader.setProgress(progress)
		})
	}

	initSmoothScrolling()
	initMenus()
	initHeaderOnScroll()
	homeAnimationBootstrap()
	buttonAnimations()

	// Wait for Three.js to fully load
	await initThree()

	// Complete the loader after Three.js is ready
	if (loader) {
		loader.complete()
	}

	initNewsSwiper()
	initMouseFollower()
	initCapabilityScroller()
	initProjectScroller()
	initNewsScroller()
})
