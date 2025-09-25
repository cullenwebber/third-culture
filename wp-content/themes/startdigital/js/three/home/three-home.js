import SceneManager from '../scene-manager'
import CtaScene from '../scenes/cta-scene'
import HeroScene from '../scenes/home-scene'
import LogoPhysicsScene from '../scenes/logo-physics-scene'
import ProjectsGridScene from '../scenes/projects-grid-scene'
import ServicesScene from '../scenes/services-scene'
import WindowScene from '../scenes/window-scene'
import { createCanvas } from '../utils'

function initHomeThree() {
	const heroContainer = document.querySelector('#home-hero')
	const logoContainer = document.querySelector('#home-about')
	const projectsContainer = document.querySelector('#project-grid')
	const ctaContainer = document.querySelector('#cta-center')

	if (!heroContainer || !logoContainer || !projectsContainer || !ctaContainer)
		return

	const canvas = createCanvas()
	const sceneManager = new SceneManager(canvas)

	// Add scenes
	const heroScene = sceneManager.addScene(HeroScene, 'hero', heroContainer, 0)
	sceneManager.addScene(LogoPhysicsScene, 'logo', logoContainer, 4)
	sceneManager.addScene(WindowScene, 'window', heroContainer, 5)
	sceneManager.addScene(ProjectsGridScene, 'projects', projectsContainer, 3)
	sceneManager.addScene(ServicesScene, 'services', heroContainer, 2)
	sceneManager.addScene(CtaScene, 'cta', ctaContainer, 1)

	sceneManager.start()
}

export default initHomeThree
