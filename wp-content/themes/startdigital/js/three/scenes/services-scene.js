import * as THREE from 'three'
import { gsap } from 'gsap'
import BaseScene from '../base-scene'
import StoneMaterial from '../materials/stone'
import { getStaticPath } from '../utils'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import ContainerTracker from '../utils/container-tracker'
import servicesScrollTrigger from '../animate/home-services-trigger'
import { getLenis } from '../../utils/smooth-scroll'

class ServicesScene extends BaseScene {
	constructor(id, container, options = {}) {
		super(id, container)
		this.meshs = []
		this.lenis = getLenis()
		this.direction = 1
	}

	setupScene() {
		this.targetContainer = document.querySelector(`#service-0`)
		this.setupContainerTracking()
	}

	setupContainerTracking() {
		this.containerTracker = new ContainerTracker(
			this.scene,
			this.camera,
			this.container
		)
	}

	createMaterials() {
		this.concreteMaterial = new StoneMaterial()
	}

	createObjects() {
		this.configureLoader()
		this.createButtons()
	}

	configureLoader() {
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
		)
		this.gltfLoader = new GLTFLoader()
		this.gltfLoader.setDRACOLoader(dracoLoader)
	}

	async createButtons() {
		const modelPaths = [
			getStaticPath('/campaign.glb'),
			getStaticPath('/brand.glb'),
			getStaticPath('/digital.glb'),
			getStaticPath('/design.glb'),
		]

		this.meshGroup = new THREE.Group()

		const loadPromises = modelPaths.map((path, index) => {
			return new Promise((resolve, reject) => {
				this.gltfLoader.load(
					path,
					(gltf) => {
						const box = new THREE.Box3().setFromObject(gltf.scene)
						const size = new THREE.Vector3()
						box.getSize(size)

						const dimensions = {
							width: size.x,
							height: size.y,
							depth: size.z,
						}

						const mesh = gltf.scene.clone()

						mesh.traverse((child) => {
							if (child.isMesh) {
								child.castShadow = true
								child.material = this.concreteMaterial.getMaterial()
								child.scale.set(0, 0, 0)
							}
						})

						mesh.userData.dimensions = dimensions
						mesh.userData.modelIndex = index

						this.meshs[index] = mesh
						this.meshGroup.add(mesh)

						resolve({ gltf, index, dimensions })
					},
					undefined,
					(error) => {
						console.error(`Error loading model ${index}:`, error)
						reject(error)
					}
				)
			})
		})

		return Promise.all(loadPromises)
			.then((results) => {
				this.originalDimensions = results[0].dimensions
				this.scene.add(this.meshGroup)
				this.setupTracking()
				return results
			})
			.catch((error) => {
				console.error('Error loading one or more models:', error)
				throw error
			})
	}

	setupTracking() {
		this.meshs.forEach((mesh, i) => {
			if (!this.targetContainer || !mesh) return
			this.containerTracker.addTrackedObject(`service-mesh-${i}`, {
				object3D: mesh,
				htmlContainer: this.targetContainer,
				originalDimensions: this.originalDimensions,
				scalingMode: 'width',
				scaleMultiplier: 0.98,
				offsetZ: 0,
			})
		})

		new servicesScrollTrigger(this)
	}

	createLights() {
		this.spotLight = new THREE.SpotLight(0xffffff, 5.0)
		this.spotLight.position.set(0.0, 0.0, 3.0)
		this.scene.add(this.spotLight)

		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
		this.scene.add(this.ambientLight)
	}

	onResize() {
		if (this.containerTracker) {
			this.containerTracker.updateAllPositions()
		}
	}

	animate(deltaTime) {
		this.time += deltaTime

		const velocity = this.lenis.velocity
		if (velocity > 0) {
			this.direction = 1
		} else {
			this.direction = -1
		}

		this.meshGroup.rotation.y +=
			deltaTime * 0.75 * this.direction + velocity * 0.005
	}

	dispose() {
		if (this.resizeListener) {
			window.removeEventListener('resize', this.resizeListener)
		}
		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
		}
		if (this.containerTracker) {
			this.containerTracker.dispose()
		}
		super.dispose?.()
	}
}

export default ServicesScene
