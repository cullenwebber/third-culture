import * as THREE from 'three'
import BaseScene from '../base-scene'
import ImageMaterial from '../materials/image-material'
import { getLenis } from '../../utils/smooth-scroll'
import ProjectsScrollTrigger from '../animate/home-projects-trigger'

class ProjectsScene extends BaseScene {
	createMaterials() {
		this.imageMaterials = []
	}

	createObjects() {
		this.createImagePlanes()
	}

	createImagePlanes() {
		this.imagePlanes = []
		const images = document.querySelectorAll('.three-project-images')
		if (!images) return
		images.forEach((image, i) => {
			this.imagePlanes[i] = this.createImagePlane(image.src, i)
			const box = new THREE.Box3().setFromObject(this.imagePlanes[i])
			this.imagePlanes[i].position.y = i * -(box.max.y - box.min.y + 0.25)
			this.scene.add(this.imagePlanes[i])
		})
	}

	createScrollTriggers() {
		this.animationTriggers = new ProjectsScrollTrigger(this)
	}

	createImagePlane(imageSrc, i) {
		let { width, height } = this.getFrustumDimensions(0.75)

		// Make width 1/3 of screen and height 5/4 of  that
		width = width * this.getImagePlaneWidth()
		height = width * (5 / 4)

		const geo = new THREE.PlaneGeometry(width, height, 8, 8)
		this.imageMaterials[i] = new ImageMaterial({
			uTexture: new THREE.Texture(),
			uTextureSize: new THREE.Vector2(1024, 1024),
			uQuadSize: new THREE.Vector2(width, height),
		})

		const mesh = new THREE.Mesh(geo, this.imageMaterials[i].getMaterial())

		const texture = new THREE.TextureLoader().load(
			imageSrc,
			(loadedTexture) => {
				this.imageMaterials[i].material.uniforms.uTexture.value = loadedTexture
				this.imageMaterials[i].material.uniforms.uTextureSize.value =
					new THREE.Vector2(
						loadedTexture.image.width,
						loadedTexture.image.height
					)
			}
		)
		return mesh
	}

	getImagePlaneWidth() {
		const width = window.innerWidth

		let planeScale = 1

		if (width > 1024) {
			planeScale = 1 / 3
		} else {
			planeScale = 1
		}

		return planeScale
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect

		return { width, height }
	}

	animate(deltaTime) {
		this.lenis = getLenis()
		const lenisVelocity = this.lenis.velocity
		this.imageMaterials.forEach((material) => {
			material.setScrollVelocity(lenisVelocity)
		})
	}
}

export default ProjectsScene
