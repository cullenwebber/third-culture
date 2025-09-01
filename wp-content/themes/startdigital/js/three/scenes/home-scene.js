import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import BaseScene from '../base-scene'
import { getStaticPath } from '../utils'
import { getLenis } from '../../utils/smooth-scroll'
import ConcreteShaderMaterial from '../materials/white-concrete'
import OverlayShaderMaterial from '../materials/overlay-material'
import HeroScrollTrigger from '../animate/home-three-trigger'

class HomeScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.lastMousePosition = null
		this.lastMouseTime = null
		this.currentMousePosition = { x: 0, y: 0 }
	}
	createMaterials() {
		this.concreteMaterial = new ConcreteShaderMaterial()
		this.overlayMaterial = new OverlayShaderMaterial()
	}

	createObjects() {
		this.createFullScreenPlane()
		this.createFullScreenPlaneOverlay()
		this.loadLogo()
	}

	loadLogo() {
		const glbPath = getStaticPath('/logo-less-sharp.glb')
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
		)

		const gltfLoader = new GLTFLoader()
		gltfLoader.setDRACOLoader(dracoLoader)

		gltfLoader.load(
			glbPath,
			(gltf) => {
				this.logo = gltf.scene
				this.originalLogoDimensions = this.getLogoBoundingBox()

				this.updateLogoScale()

				const bottomY = this.getBottomPosition(0.6)
				this.logo.position.set(0, bottomY, 0.05)

				this.logo.traverse((child) => {
					if (child.isMesh) {
						child.castShadow = true
						child.material = this.concreteMaterial.getMaterial()
					}
				})

				this.animationTriggers = new HeroScrollTrigger(this)
				this.scene.add(this.logo)
			},
			undefined,
			undefined
		)
	}

	updateLogoScale() {
		if (!this.logo || !this.originalLogoDimensions) return

		const { width, height } = this.getFrustumDimensions()
		const targetLogoWidth = width * 0.95

		const logoActualWidth = this.originalLogoDimensions.width
		const scale = targetLogoWidth / logoActualWidth

		this.logo.scale.setScalar(scale)
	}

	getLogoBoundingBox() {
		if (!this.logo) return { width: 1, height: 1 }

		const box = new THREE.Box3().setFromObject(this.logo)
		return {
			width: box.max.x - box.min.x,
			height: box.max.y - box.min.y,
		}
	}

	createFullScreenPlane() {
		const { width, height } = this.getFrustumDimensions()
		const plane = new THREE.PlaneGeometry(width, height, 1, 1)
		const mesh = new THREE.Mesh(plane, this.concreteMaterial.getMaterial())
		mesh.receiveShadow = true

		this.backgroundPlane = mesh
		this.scene.add(mesh)
	}

	createFullScreenPlaneOverlay() {
		const { width, height } = this.getFrustumDimensions(1)
		const plane = new THREE.PlaneGeometry(width, height, 1, 1)
		const mesh = new THREE.Mesh(plane, this.overlayMaterial.getMaterial())
		mesh.receiveShadow = true
		mesh.position.z = 1

		this.overlayPlane = mesh
		this.scene.add(mesh)
	}

	createMouseListeners() {
		this.handleMouseMove = this.handleMouseMove.bind(this)
		window.addEventListener('mousemove', this.handleMouseMove)
	}

	handleMouseMove(event) {
		const x = event.clientX / window.innerWidth
		const y = 1 - event.clientY / window.innerHeight
		const lightX = (event.clientX / window.innerWidth) * 2 - 1
		const lightY = (event.clientY / window.innerHeight) * 0.5 + 0.5
		const lightZ = 2.0

		this.currentMousePosition = { x, y }

		this.concreteMaterial.animateLight(
			new THREE.Vector3(lightX, lightY, lightZ)
		)

		this.overlayMaterial.updateMousePosition(new THREE.Vector2(x, y))
	}

	handleMouseVelocity() {
		const currentTime = performance.now()
		const deltaTime = currentTime - (this.lastMouseTime || currentTime)

		if (this.lastMousePosition && deltaTime > 0) {
			const deltaX = this.currentMousePosition.x - this.lastMousePosition.x
			const deltaY = this.currentMousePosition.y - this.lastMousePosition.y
			const velocity =
				(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime) * 1000
			this.overlayMaterial.updateMouseVelocity(velocity)
		}

		this.lastMousePosition = { ...this.currentMousePosition }
		this.lastMouseTime = currentTime
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect

		return { width, height }
	}

	getWorldSizeFromPixels(options) {
		const containerRect = this.container.getBoundingClientRect()

		// Calculate actual distance from camera to the z-plane
		const distance = Math.abs(this.camera.position.z)
		const frustum = this.getFrustumDimensions(distance)

		const result = {}

		if (options.width !== undefined) {
			const worldUnitsPerPixel = frustum.width / containerRect.width
			result.width = options.width * worldUnitsPerPixel
		}

		if (options.height !== undefined) {
			const worldUnitsPerPixel = frustum.height / containerRect.height
			result.height = options.height * worldUnitsPerPixel
		}

		return result
	}

	getBottomPosition(offsetMultiplier = 1) {
		const { height } = this.getFrustumDimensions()
		return (-height / 2) * offsetMultiplier
	}

	onResize() {
		const { width, height } = this.getFrustumDimensions(0)
		const { width: overlayWidth, height: overlayHeight } =
			this.getFrustumDimensions(1)

		this.backgroundPlane.geometry.dispose()
		this.backgroundPlane.geometry = new THREE.PlaneGeometry(width, height, 1, 1)

		this.overlayPlane.geometry.dispose()
		this.overlayPlane.geometry = new THREE.PlaneGeometry(
			overlayWidth,
			overlayHeight,
			1,
			1
		)

		if (this.logo) {
			this.updateLogoScale()
			// const bottomY = this.getBottomPosition(0.6)
			// this.logo.position.setY(bottomY)
		}
	}

	animate(deltaTime) {
		this.time += deltaTime
		this.lenis = getLenis()
		const progress = this.lenis.progress
		this.concreteMaterial.updateFromScroll(0, -progress, 2.0)

		this.handleMouseVelocity()
		this.overlayMaterial.updateTime(this.time)
	}
}

export default HomeScene
