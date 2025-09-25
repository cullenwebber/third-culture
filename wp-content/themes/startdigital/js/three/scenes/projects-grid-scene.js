import * as THREE from 'three'
import BaseScene from '../base-scene'
import TrackedPlane from '../utils/tracked-plane'
import { getLenis } from '../../utils/smooth-scroll'
import WebGLText from '../utils/webgl-text'

class ProjectsGridScene extends BaseScene {
	setupScene() {
		this.lenis = getLenis()
		this.imageContainers = document.querySelectorAll('.image-container')
		this.projectTextEl = document.querySelector('.project-title .is-h1')
		this.projectNumEl = document.querySelector('.project-title h6')
	}

	createObjects() {
		this.createImagePlanes()
		this.createProjectText()
	}

	createProjectText() {
		new WebGLText(this.scene, this.camera, this.projectTextEl, this.container, {
			material: new THREE.MeshBasicMaterial({ color: 0xffffff }),
			zPosition: -1,
		})
		new WebGLText(this.scene, this.camera, this.projectNumEl, this.container, {
			material: new THREE.MeshBasicMaterial({ color: 0xffffff }),
			zPosition: -1,
		})
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
					zPosition: index % 2 === 0 ? -2 : 0,
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

export default ProjectsGridScene
