import SceneManager from './scene-manager'
import HeroScene from './scenes/home-scene'
import HomeProjectsScene from './scenes/home-projects-scene'
import { createCanvas } from './utils'
import HomeCapabilitiesScene from './scenes/home-capabilities-scene'
import NewsScene from './scenes/news-scene'
import FooterScene from './scenes/footer-scene'

function initThree() {
	const heroContainer = document.querySelector('#frontpage-hero')
	const projectsContainer = document.querySelector('#home-projects-container')
	const capabilitiesContainer = document.querySelector(
		'#home-capabilities-container'
	)
	const newsContainer = document.querySelector('#news-scene')
	const footerContainer = document.querySelector('footer')
	const canvas = createCanvas()
	const sceneManager = new SceneManager(canvas)

	// Home page
	if (heroContainer) sceneManager.addScene(HeroScene, 'hero', heroContainer, 0)
	if (projectsContainer)
		sceneManager.addScene(
			HomeProjectsScene,
			'home-projects',
			projectsContainer,
			1
		)
	if (capabilitiesContainer)
		sceneManager.addScene(
			HomeCapabilitiesScene,
			'home-capabilities',
			capabilitiesContainer,
			2
		)

	if (newsContainer)
		sceneManager.addScene(NewsScene, 'news', newsContainer, 3)

	if (footerContainer)
		sceneManager.addScene(FooterScene, 'footer', footerContainer, 4)

	sceneManager.start()
}

export default initThree
