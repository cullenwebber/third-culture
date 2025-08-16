import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import BaseScene from '../base-scene'
import { getStaticPath } from '../utils'
import { getLenis } from '../../utils/smooth-scroll'
import ConcreteShaderMaterial from '../materials/white-concrete'
import HeroScrollTrigger from '../animate/home-three-trigger'

class HomeScene extends BaseScene {
	createMaterials() {
		this.concreteMaterial = new ConcreteShaderMaterial()
	}

	createObjects() {
		this.createFullScreenPlane()
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
				this.logo.scale.setScalar(0.2)

				const bottomY = this.getBottomPosition(0.6)
				this.logo.position.set(0, bottomY, 0.05)

				this.logo.traverse((child) => {
					if (child.isMesh) {
						child.castShadow = true
						child.material = this.concreteMaterial.getMaterial()
					}
				})

				// This is only here because it requires the logo to be loaded in first
				this.animationTriggers = new HeroScrollTrigger(this)
				this.scene.add(this.logo)
			},
			undefined,
			undefined
		)
	}

	createFullScreenPlane() {
		const { width, height } = this.getFrustumDimensions()
		const plane = new THREE.PlaneGeometry(width, height, 1, 1)
		const mesh = new THREE.Mesh(plane, this.concreteMaterial.getMaterial())
		mesh.receiveShadow = true

		this.backgroundPlane = mesh
		this.scene.add(mesh)
	}

	createMouseListeners() {
		this.handleMouseMove = this.handleMouseMove.bind(this)
		window.addEventListener('mousemove', this.handleMouseMove)
	}

	handleMouseMove(event) {
		const x = (event.clientX / window.innerWidth) * 2 - 1
		const y = event.clientY / window.innerHeight
		const lightX = x
		const lightY = y * 0.5 + 0.5
		const lightZ = 2.0

		this.concreteMaterial.animateLight(
			new THREE.Vector3(lightX, lightY, lightZ)
		)
	}

	getFrustumDimensions() {
		const distance = this.camera.position.z
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect

		return { width, height }
	}

	getBottomPosition(offsetMultiplier = 1) {
		const { height } = this.getFrustumDimensions()
		return (-height / 2) * offsetMultiplier
	}

	animate(deltaTime) {
		this.lenis = getLenis()
		const progress = this.lenis.progress
		this.concreteMaterial.updateFromScroll(0, -progress, 1.25)
	}
}

export default HomeScene
