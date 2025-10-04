import SceneManager from './scene-manager'
import HeroScene from './scenes/home-scene'
import LogoPhysicsScene from './scenes/logo-physics-scene'
import ProjectsGridScene from './scenes/projects-grid-scene'
import ServicesScene from './scenes/services-scene'
import WindowScene from './scenes/window-scene'
import NewsScene from './scenes/news-scene'
import { createCanvas } from './utils'
import FooterScene from './scenes/footer-scene'

function initThree() {
	const heroContainer = document.querySelector('#home-hero')
	const logoContainer = document.querySelector('#home-about')
	const projectsContainer = document.querySelector('#project-grid')
	const servicesContainer = document.querySelector('#page-capabilities')
	const newsContainer = document.querySelector('#home-news-trigger')
	const innerPageContainer = document.querySelector('#page-inner')

	const canvas = createCanvas()
	const sceneManager = new SceneManager(canvas)

	// Home page
	if (heroContainer) sceneManager.addScene(HeroScene, 'hero', heroContainer, 0)

	if (logoContainer)
		sceneManager.addScene(LogoPhysicsScene, 'logo', logoContainer, 4)

	if (heroContainer)
		sceneManager.addScene(WindowScene, 'window', heroContainer, 5)

	if (projectsContainer)
		sceneManager.addScene(
			ProjectsGridScene,
			'projectsHome',
			projectsContainer,
			3
		)

	if (heroContainer)
		sceneManager.addScene(ServicesScene, 'services', heroContainer, 2)

	if (newsContainer) sceneManager.addScene(NewsScene, 'news', newsContainer, 2)

	// Capabilities page
	if (servicesContainer)
		sceneManager.addScene(ServicesScene, 'services', servicesContainer, 2)

	// Inner Pages
	if (innerPageContainer)
		sceneManager.addScene(FooterScene, 'footer', innerPageContainer, 0)

	sceneManager.start()
}

export default initThree
