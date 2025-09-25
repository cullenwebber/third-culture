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
			this.scene.add(this.imagePlanes[i])
		})

		const radius = this.calculateDynamicRadius(images.length)
		this.radius = radius
		const totalAngle = Math.PI * 0.35
		const angleStep = totalAngle / Math.max(1, images.length - 1)
		const startAngle = -totalAngle

		this.imagePlanes.forEach((plane, i) => {
			const angle = startAngle + i * angleStep
			plane.position.y = Math.sin(angle) * radius
			plane.position.z = Math.cos(angle) * radius - radius
			plane.position.x = 0

			plane.rotation.x = -angle
		})
	}

	calculateDynamicRadius(imageLength) {
		if (!imageLength || !this.imagePlanes.length) return 12

		let maxWidth = 0
		let maxHeight = 0
		let maxDiagonal = 0

		// Now we can properly measure the created planes
		this.imagePlanes.forEach((plane) => {
			const box = new THREE.Box3().setFromObject(plane)
			const height = box.max.y - box.min.y
			const width = box.max.x - box.min.x
			const diagonal = Math.sqrt(width * width + height * height)

			maxWidth = Math.max(maxWidth, width)
			maxHeight = Math.max(maxHeight, height)
			maxDiagonal = Math.max(maxDiagonal, diagonal)
		})

		const numPlanes = imageLength
		const totalAngle = Math.PI * 0.54 // Keep consistent with your usage
		const angleStep = totalAngle / Math.max(1, numPlanes - 1)

		const minChordLength = maxDiagonal * 1.1

		const minRadiusFromChord = minChordLength / (2 * Math.sin(angleStep / 2))
		const minRadiusFromDimensions = Math.max(maxWidth, maxHeight) * 0.8

		let baseRadius = Math.max(minRadiusFromChord, minRadiusFromDimensions)

		const screenFactor = 1.1
		const finalRadius = baseRadius * screenFactor

		return Math.max(finalRadius, 8)
	}

	createScrollTriggers() {
		this.animationTriggers = new ProjectsScrollTrigger(this)
	}

	createImagePlane(imageSrc, i) {
		let { width, height } = this.getFrustumDimensions(0.75)

		// Make width 1/3 of screen and height 5/4 of  that
		width = width * this.getImagePlaneWidth()
		height = width * (5 / 4)

		const geo = new THREE.PlaneGeometry(width, height, 16, 16)
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
		this.time += deltaTime
		this.lenis = getLenis()
		const lenisVelocity = this.lenis.velocity
		this.imageMaterials.forEach((material) => {
			material.setScrollVelocity(lenisVelocity)
			material.updateTime(this.time)
		})
	}
}

export default ProjectsScene
