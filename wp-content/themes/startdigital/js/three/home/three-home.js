import SceneManager from '../scene-manager'
import HeroScene from '../scenes/home-scene'
import LogoPhysicsScene from '../scenes/logo-physics-scene'
import { createCanvas } from '../utils'

function initHomeThree() {
	const heroContainer = document.querySelector('#home-hero')
	const logoContainer = document.querySelector('#home-about')

	if (!heroContainer || !logoContainer) return

	const canvas = createCanvas()
	const sceneManager = new SceneManager(canvas)

	sceneManager.addScene(HeroScene, 'hero', heroContainer)
	sceneManager.addScene(LogoPhysicsScene, 'logo', logoContainer)

	sceneManager.start()
}

export default initHomeThree
