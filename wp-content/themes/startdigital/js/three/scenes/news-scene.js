import * as THREE from 'three'
import BaseScene from '../base-scene'
import TrackedPlane from '../utils/tracked-plane'
import { getLenis } from '../../utils/smooth-scroll'

class NewsScene extends BaseScene {
	setupScene() {
		this.lenis = getLenis()
		this.imageContainers = document.querySelectorAll(
			'.post-teases .image-container'
		)
	}

	createObjects() {
		this.createImagePlanes()
	}

	createImagePlanes() {
		this.imageMaterials = []
		this.imageContainers.forEach((container, index) => {
			const trackedImage = new TrackedPlane(
				this.scene,
				this.camera,
				container,
				this.container,
				{
					zPosition: 0.1,
				}
			)

			this.imageMaterials.push(trackedImage.getImageMaterial())
		})
	}

	animate(deltaTime) {
		this.time += deltaTime
		this.imageMaterials.forEach((material) => {
			material.updateTime(this.time)
		})
	}
}

export default NewsScene
