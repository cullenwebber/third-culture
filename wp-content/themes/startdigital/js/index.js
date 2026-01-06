import Swup from 'swup'
import SwupHeadPlugin from '@swup/head-plugin'
import SwupPreloadPlugin from '@swup/preload-plugin'
import SwupScriptsPlugin from '@swup/scripts-plugin'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import initMenus, { closeMenu, destroyMenus } from './components/menus'
import initHeaderOnScroll, {
	destroyHeaderOnScroll,
} from './utils/headerOnScroll'
import initSmoothScrolling from './utils/smooth-scroll'

import buttonAnimations, {
	destroyButtonAnimations,
} from './animations/buttonAnimation'
import initThree, {
	destroyThree,
	setLoadingProgressCallback,
} from './three/init-three'
import initNewsSwiper, { destroyNewsSwiper } from './components/news-slider'
import initMouseFollower, {
	destroyMouseFollower,
} from './components/mouse-follower'
import initCapabilityScroller, {
	destroyCapabilityScroller,
} from './components/capability-scroller'
import initProjectScroller, {
	destroyProjectScroller,
} from './components/project-scroller'
import initNewsScroller, {
	destroyNewsScroller,
} from './components/news-scroller'
import { initPageLoader, getPageLoader } from './components/page-loader'
import splitTextAnimation, {
	destroySplitTextAnimation,
} from './animations/splitTextAnimation'

gsap.registerPlugin(ScrollTrigger)

let swup = null
let pageLoader = null

async function initPage() {
	// Initialize loader
	pageLoader = initPageLoader()

	// Set up progress callback for Three.js loading
	if (pageLoader) {
		setLoadingProgressCallback((progress) => {
			pageLoader.setProgress(progress)
		})
	}

	initSmoothScrolling()
	initMenus()
	initHeaderOnScroll()

	buttonAnimations()

	// Wait for Three.js to fully load
	await initThree()

	// Complete the loader after Three.js is ready (only on first load)
	if (pageLoader && pageLoader.isFirstLoad) {
		await pageLoader.complete()
	}

	initNewsSwiper()
	initMouseFollower()
	initCapabilityScroller()
	initProjectScroller()
	initNewsScroller()
	splitTextAnimation()
}

function destroyPage() {
	// Kill all GSAP animations and ScrollTriggers
	ScrollTrigger.getAll().forEach((st) => st.kill())

	// Destroy Three.js and WebGL context
	destroyThree()

	destroyHeaderOnScroll()

	destroyButtonAnimations()
	destroyNewsSwiper()
	destroyMouseFollower()
	destroyCapabilityScroller()
	destroyProjectScroller()
	destroyNewsScroller()
	destroySplitTextAnimation()
}

async function reinitPage() {
	initHeaderOnScroll()
	buttonAnimations()

	// Wait for Three.js to fully load
	await initThree()

	initNewsSwiper()
	initMouseFollower()
	initCapabilityScroller()
	initProjectScroller()
	initNewsScroller()
	splitTextAnimation()

	// Refresh ScrollTrigger after new content
	ScrollTrigger.refresh()
}

function initSwup() {
	swup = new Swup({
		containers: ['#page-content'],
		animationSelector: false, // We handle animations manually
		plugins: [
			new SwupHeadPlugin(),
			new SwupPreloadPlugin(),
			new SwupScriptsPlugin({
				head: false,
				body: false,
			}),
		],
	})

	window.swup = swup

	// Leave animation - animate loader IN (cover the page)
	swup.hooks.on('animation:out:await', async () => {
		closeMenu()
		if (pageLoader) {
			await pageLoader.animateIn()
		}
	})

	// After leave animation, before content replace - cleanup
	swup.hooks.on('content:replace', () => {
		destroyPage()
	})

	// After content is replaced - reinitialize
	swup.hooks.on('content:replace', async () => {
		await reinitPage()
	})

	// Enter animation - animate loader OUT (reveal the page)
	swup.hooks.on('animation:in:await', async () => {
		if (pageLoader) {
			await pageLoader.animateOut()
		}
	})
}

document.addEventListener('DOMContentLoaded', async () => {
	await initPage()
	initSwup()
})
