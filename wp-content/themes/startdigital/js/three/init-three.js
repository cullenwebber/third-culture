import SceneManager from './scene-manager'
import HeroScene from './scenes/home-scene'
import HomeProjectsScene from './scenes/home-projects-scene'
import { createCanvas } from './utils'
import HomeCapabilitiesScene from './scenes/home-capabilities-scene'
import NewsScene from './scenes/news-scene'
import FooterScene from './scenes/footer-scene'
import ContactScene from './scenes/contact-scene'
import PageInnerScene from './scenes/page-inner-scene'
import AboutScene from './scenes/about-scene'
import PageInnerSceneAlt from './scenes/page-inner-scene-alt'
import NotFoundScene from './scenes/404-scene'
import ProjectScene from './scenes/project-scene'
import CapabilityHeaderScene from './scenes/capability-header-scene'
import CapabilitiesArchiveScene from './scenes/capabilities-archive-scene'

let sceneManager = null

// Progress callback for loading
let onProgressCallback = null

export function setLoadingProgressCallback(callback) {
	onProgressCallback = callback
}

async function initThree() {
	const heroContainer = document.querySelector('#frontpage-hero')
	const projectsContainer = document.querySelector('#home-projects-container')
	const capabilitiesContainer = document.querySelector(
		'#home-capabilities-container'
	)
	const newsContainer = document.querySelector('#news-scene')
	const footerContainer = document.querySelector('footer')
	const contactContainer = document.querySelector('#contact-container')
	const pageInnerContainer = document.querySelector('#white-page')
	const pageInnerAltContainer = document.querySelector('#no-grid-white-page')
	const aboutContainer = document.querySelector('#about-scene')
	const projectContainer = document.querySelector('#project-scene')
	const notFoundContainer = document.querySelector('#not-found-scene')
	const capabilitiesHeaderContainer =
		document.querySelector('#capability-scene')
	const capabilitiesArchiveContainer = document.querySelector(
		'#capabilities-archive-scene'
	)
	const canvas = createCanvas()
	sceneManager = new SceneManager(canvas)

	// Build list of scenes to load
	const scenesToLoad = []

	if (heroContainer)
		scenesToLoad.push({
			Scene: HeroScene,
			id: 'hero',
			container: heroContainer,
			priority: 0,
		})
	if (projectsContainer)
		scenesToLoad.push({
			Scene: HomeProjectsScene,
			id: 'home-projects',
			container: projectsContainer,
			priority: 1,
		})
	if (capabilitiesContainer)
		scenesToLoad.push({
			Scene: HomeCapabilitiesScene,
			id: 'home-capabilities',
			container: capabilitiesContainer,
			priority: 2,
		})
	if (newsContainer)
		scenesToLoad.push({
			Scene: NewsScene,
			id: 'news',
			container: newsContainer,
			priority: 3,
		})
	if (footerContainer)
		scenesToLoad.push({
			Scene: FooterScene,
			id: 'footer',
			container: footerContainer,
			priority: 7,
		})
	if (contactContainer)
		scenesToLoad.push({
			Scene: ContactScene,
			id: 'contact',
			container: contactContainer,
			priority: 5,
		})
	if (pageInnerContainer)
		scenesToLoad.push({
			Scene: PageInnerScene,
			id: 'page-inner',
			container: pageInnerContainer,
			priority: 1,
		})
	if (pageInnerAltContainer)
		scenesToLoad.push({
			Scene: PageInnerSceneAlt,
			id: 'page-inner-alt',
			container: pageInnerAltContainer,
			priority: 1,
		})
	if (aboutContainer)
		scenesToLoad.push({
			Scene: AboutScene,
			id: 'about',
			container: aboutContainer,
			priority: 2,
		})
	if (projectContainer)
		scenesToLoad.push({
			Scene: ProjectScene,
			id: 'project',
			container: projectContainer,
			priority: 2,
		})
	if (capabilitiesHeaderContainer)
		scenesToLoad.push({
			Scene: CapabilityHeaderScene,
			id: 'capability-header',
			container: capabilitiesHeaderContainer,
			priority: 3,
		})
	if (capabilitiesArchiveContainer)
		scenesToLoad.push({
			Scene: CapabilitiesArchiveScene,
			id: 'capabilities-archive',
			container: capabilitiesArchiveContainer,
			priority: 2,
		})
	if (notFoundContainer)
		scenesToLoad.push({
			Scene: NotFoundScene,
			id: '404',
			container: notFoundContainer,
			priority: 1,
		})

	// Load scenes with progress tracking
	const totalScenes = scenesToLoad.length
	let loadedScenes = 0

	for (const { Scene, id, container, priority } of scenesToLoad) {
		await sceneManager.addScene(Scene, id, container, priority)
		loadedScenes++
		if (onProgressCallback) {
			onProgressCallback(loadedScenes / totalScenes)
		}
	}

	sceneManager.start()

	// Dispatch event when all scenes are loaded
	window.dispatchEvent(new CustomEvent('threeReady'))
}

export function destroyThree() {
	if (sceneManager) {
		sceneManager.dispose()
		sceneManager = null
	}
	// Remove existing canvas
	const existingCanvas = document.querySelectorAll('canvas')
	if (existingCanvas.length > 0) {
		existingCanvas.forEach((c) => c.remove())
	}
}

export default initThree
