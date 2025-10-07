import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import BaseScene from '../base-scene'
import { getStaticPath } from '../utils'
import ConcreteShaderMaterial from '../materials/white-concrete'
import BackgroundShaderMaterial from '../materials/background-material'
import ContainerTracker from '../utils/container-tracker'
import TrackedRoundedBoxGeometry from '../utils/tracked-box-geometry'

class PageScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.lastMousePosition = null
		this.lastMouseTime = null
		this.currentMousePosition = { x: 0, y: 0 }
		this.originalStoneDimensions = null
		this.footerLogoContainer = null
	}

	setupScene() {
		this.scene.background = new THREE.Color(0x1e1e1e)
	}

	setupContainerTracking() {
		this.containerTracker = new ContainerTracker(
			this.scene,
			this.camera,
			this.container
		)
	}

	createMaterials() {
		this.concreteMaterial = new ConcreteShaderMaterial()
		this.backgroundMaterial = new BackgroundShaderMaterial()
	}

	async createObjects() {
		this.configureLoader()
		this.createBackgroundPlane()
		this.setupLogoContainers()
		this.loadStone()
		await Promise.all([this.loadLogo()])
	}

	setupLogoContainers() {
		this.footerLogoContainer = document.getElementById('footer-logo-container')
	}

	configureLoader() {
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
		)
		this.gltfLoader = new GLTFLoader()
		this.gltfLoader.setDRACOLoader(dracoLoader)
	}

	async loadLogo() {
		const glbPath = getStaticPath('/logo-less-sharp.glb')

		return new Promise((resolve, reject) => {
			this.gltfLoader.load(
				glbPath,
				(gltf) => {
					// Main logo
					this.logo = gltf.scene
					this.originalLogoDimensions = this.getLogoBoundingBox()

					// Clone for footer
					this.footerLogo = this.logo.clone()
					this.footerLogo.traverse((child) => {
						if (child.isMesh) {
							child.castShadow = true
							child.material = this.concreteMaterial.getMaterial()
						}
					})
					this.scene.add(this.footerLogo)

					// Setup tracking for both logos
					this.setupLogoTracking()

					resolve(gltf)
				},
				undefined,
				(error) => {
					console.error('Error loading logo:', error)
					reject(error)
				}
			)
		})
	}

	setupLogoTracking() {
		if (this.footerLogoContainer) {
			this.containerTracker.addTrackedObject('footer-logo', {
				object3D: this.footerLogo,
				htmlContainer: this.footerLogoContainer,
				originalDimensions: this.originalLogoDimensions,
				scalingMode: 'width',
				scaleMultiplier: 1.0,
				offsetZ: 0.05,
			})
		}
	}

	loadStone() {
		const servicesBox = new TrackedRoundedBoxGeometry(this.scene, this.camera, {
			startElement: document.querySelector('#entire-page'),
			endElement: document.querySelector('footer'),
			depth: 0.6,
			radius: 0.2,
			segments: 1,
			material: this.concreteMaterial.getMaterial(),
			padding: 32,
			offsetX: 0,
			offsetY: 0,
			offsetZ: -0.3,
		})
	}

	getLogoBoundingBox() {
		if (!this.logo) return { width: 1, height: 1 }

		const box = new THREE.Box3().setFromObject(this.logo)
		return {
			width: box.max.x - box.min.x,
			height: box.max.y - box.min.y,
		}
	}

	createBackgroundPlane() {
		const { width, height } = this.getFrustumDimensions(-5)
		const plane = new THREE.PlaneGeometry(width, height, 1, 1)
		const mesh = new THREE.Mesh(plane, this.backgroundMaterial.getMaterial())
		mesh.receiveShadow = true
		mesh.position.z = -5

		this.backgroundPlane = mesh
		this.scene.add(mesh)
	}

	createMouseListeners() {
		this.handleMouseMove = this.handleMouseMove.bind(this)
		window.addEventListener('mousemove', this.handleMouseMove)
	}

	dispose() {
		if (this.handleMouseMove) {
			window.removeEventListener('mousemove', this.handleMouseMove)
		}
		if (this.containerTracker) {
			this.containerTracker.dispose()
		}
		super.dispose()
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
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect

		return { width, height }
	}

	onResize() {
		super.onResize()

		if (this.backgroundPlane) {
			const { width, height } = this.getFrustumDimensions(-5)
			this.backgroundPlane.geometry.dispose()
			this.backgroundPlane.geometry = new THREE.PlaneGeometry(
				width,
				height,
				1,
				1
			)
		}

		if (this.containerTracker) {
			this.containerTracker.updateAllPositions()
		}

		if (this.stone) {
			this.updateStoneScale()
			this.updateStonePosition()
		}
	}

	animate(deltaTime) {
		this.time += deltaTime
		this.backgroundMaterial.updateTime(this.time)
	}
}

export default PageScene
