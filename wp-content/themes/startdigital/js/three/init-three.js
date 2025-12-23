import SceneManager from './scene-manager'
import HeroScene from './scenes/home-scene'
import HomeProjectsScene from './scenes/home-projects-scene'
import { createCanvas } from './utils'
import HomeCapabilitiesScene from './scenes/home-capabilities-scene'

function initThree() {
	const heroContainer = document.querySelector('#frontpage-hero')
	const projectsContainer = document.querySelector('#home-projects-container')
	const capabilitiesContainer = document.querySelector(
		'#home-capabilities-container'
	)

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

	sceneManager.start()
}

export default initThree
