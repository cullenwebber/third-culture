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

function initThree() {
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

	if (newsContainer) sceneManager.addScene(NewsScene, 'news', newsContainer, 3)

	if (footerContainer)
		sceneManager.addScene(FooterScene, 'footer', footerContainer, 7)

	if (contactContainer)
		sceneManager.addScene(ContactScene, 'contact', contactContainer, 5)

	if (pageInnerContainer)
		sceneManager.addScene(PageInnerScene, 'page-inner', pageInnerContainer, 1)

	if (pageInnerAltContainer)
		sceneManager.addScene(
			PageInnerSceneAlt,
			'page-inner-alt',
			pageInnerAltContainer,
			1
		)

	if (aboutContainer)
		sceneManager.addScene(AboutScene, 'about', aboutContainer, 2)

	if (projectContainer)
		sceneManager.addScene(ProjectScene, 'project', projectContainer, 2)

	if (notFoundContainer)
		sceneManager.addScene(NotFoundScene, '404', notFoundContainer, 1)

	sceneManager.start()
}

export default initThree
