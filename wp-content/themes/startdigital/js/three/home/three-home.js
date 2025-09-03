import SceneManager from '../scene-manager'
import CapabilitiesScene from '../scenes/capabilities-scene'
import CtaScene from '../scenes/cta-scene'
import HeroScene from '../scenes/home-scene'
import LogoPhysicsScene from '../scenes/logo-physics-scene'
import ProjectsScene from '../scenes/projects-scene'
import { createCanvas } from '../utils'

function initHomeThree() {
	const heroContainer = document.querySelector('#home-hero')
	const logoContainer = document.querySelector('#home-about')
	const capabilitiesContainer = document.querySelector('#home-capabilities')
	const projectsContainer = document.querySelector('#home-projects')
	const ctaContainer = document.querySelector('#cta-center')

	if (
		!heroContainer ||
		!logoContainer ||
		!capabilitiesContainer ||
		!projectsContainer ||
		!ctaContainer
	)
		return

	const canvas = createCanvas()
	const sceneManager = new SceneManager(canvas)

	// Add scenes
	const heroScene = sceneManager.addScene(HeroScene, 'hero', heroContainer)
	sceneManager.addScene(LogoPhysicsScene, 'logo', logoContainer)
	sceneManager.addScene(
		CapabilitiesScene,
		'capabilities',
		capabilitiesContainer
	)
	sceneManager.addScene(ProjectsScene, 'projects', projectsContainer)
	sceneManager.addScene(CtaScene, 'cta', ctaContainer)

	sceneManager.start()
}

export default initHomeThree
