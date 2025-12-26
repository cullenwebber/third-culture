import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DestructibleMesh, FractureOptions } from '@dgreenheck/three-pinata'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import BaseScene from '../base-scene'
import { getStaticPath } from '../utils'
import ContainerTracker from '../utils/container-tracker'
import GradientMaterial from '../materials/gradient-material'
import WebGLText from '../utils/webgl-text'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import WebGLManager from '../context-manager'
import MeshTransmissionMaterial from '../materials/MeshTransmissionMaterial'

gsap.registerPlugin(ScrollTrigger)

class HomeScene extends BaseScene {
	setupScene() {
		this.context = new WebGLManager()
		const environment = new RoomEnvironment()
		const pmremGenerator = new THREE.PMREMGenerator(this.context.renderer)
		this.envMap = pmremGenerator.fromScene(environment).texture
		this.scene.environment = this.envMap
	}

	createMaterials() {
		const { width: canvasWidth, height: canvasHeight } =
			this.container.getBoundingClientRect()
		this.gradientMaterial = new GradientMaterial()
		this.gradientMaterial.uniforms.resolution.value.set(
			canvasWidth,
			canvasHeight
		)

		this.transmissionMaterial = Object.assign(new MeshTransmissionMaterial(5), {
			_transmission: 1.0,
			chromaticAberration: 0.05,
			roughness: 0.1,
			thickness: 1.4,
			ior: 1.4,
			distortion: 1.75,
			distortionScale: 0.8,
			temporalDistortion: 0.1,
			reflectivity: 0.1,
			flatShading: false,
		})

		this.transmissionMaterial.color.set('#999999')

		this.wireMaterial = new THREE.MeshBasicMaterial({
			color: 0x201d4d,
			wireframe: true,
		})

		this.metalMaterial = new THREE.MeshStandardMaterial({
			color: '#18154E',
			metalness: 1,
			roughness: 0.45,
		})
	}

	setupContainerTracking() {
		this.containerTracker = new ContainerTracker(
			this.scene,
			this.camera,
			this.container
		)
	}

	setupScrollAnimation() {
		const heroSection = document.querySelector('#hero-section-wrapper')

		if (!heroSection) return

		this.tl = gsap.timeline({
			scrollTrigger: {
				trigger: heroSection,
				start: 'top top',
				end: 'bottom bottom',
				scrub: true,
				ease: 'none',
			},
		})

		// Animate h1 to top left using ScrollTrigger
		this.tl

			.to(
				this.gradientMaterial.uniforms.progress,
				{
					value: 1,
					ease: 'none',
				},
				'<='
			)
			.to(
				this.gradientMaterial.uniforms.uScroll,
				{
					value: -0.5,
					ease: 'none',
				},
				'<='
			)
	}

	async createObjects() {
		const { width, height } = this.getFrustumDimensions(0)

		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.gradientMaterial)
		this.background.renderOrder = -1 // Render first, behind everything

		// Store reference to h1 for tracking
		this.h1Element = document.querySelector('h1')

		this.text = new WebGLText(
			this.scene,
			this.camera,
			this.h1Element,
			this.container
		)

		// Load the logo
		await this.loadLogo()
		// this.scene.add(this.sphere)
		this.scene.add(this.background)

		// Setup scroll animation after everything is created
		this.setupScrollAnimation()
	}

	async loadLogo() {
		const path = getStaticPath('/cube-triangle-no-damage.glb')

		// Set up DRACO loader
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')

		// Set up GLTF loader with DRACO
		const gltfLoader = new GLTFLoader()
		gltfLoader.setDRACOLoader(dracoLoader)

		// Load the model
		return new Promise((resolve, reject) => {
			gltfLoader.load(
				path,
				(gltf) => {
					this.logo = gltf.scene
					this.logoChildren = []
					this.logoFragments = []

					// Calculate original dimensions for scaling
					const bbox = new THREE.Box3().setFromObject(gltf.scene)
					const originalWidth = bbox.max.x - bbox.min.x
					const originalHeight = bbox.max.y - bbox.min.y

					// Process each mesh and create destructible versions
					this.logo.traverse((child) => {
						if (!child.isMesh) return

						// Create a group for this mesh's fragments
						const fragmentGroup = new THREE.Group()
						fragmentGroup.position.copy(child.position)
						fragmentGroup.rotation.copy(child.rotation)
						fragmentGroup.scale.copy(child.scale)
						this.logo.add(fragmentGroup)

						// Create destructible mesh from original
						const destructibleMesh = new DestructibleMesh(
							child.geometry,
							this.transmissionMaterial,
							this.transmissionMaterial
						)

						// Fracture the mesh
						const options = new FractureOptions({
							fractureMethod: 'voronoi',
							fragmentCount: 20,
							voronoiOptions: {
								mode: '3D',
							},
						})

						const fragments = destructibleMesh.fracture(options, (fragment) => {
							fragment.material = this.transmissionMaterial
							// Store initial position for animation relative to group
							fragment.userData.initialPosition = fragment.position.clone()
							fragment.userData.initialRotation = fragment.rotation.clone()
							fragment.userData.center = new THREE.Vector3()
							fragment.geometry.computeBoundingBox()
							fragment.geometry.boundingBox.getCenter(fragment.userData.center)
							fragmentGroup.add(fragment)
						})

						this.logoFragments.push(...fragments)

						// Hide original mesh
						child.visible = false

						// Store animation data
						this.logoChildren.push({
							mesh: child,
							fragmentGroup: fragmentGroup,
							initialPosition: child.position.clone(),
							initialRotation: child.rotation.clone(),
							floatOffset: Math.random() * Math.PI * 2,
							rotateOffset: Math.random() * Math.PI * 2,
						})
					})

					this.scene.add(this.logo)

					// Setup hover interaction
					this.calculateFragmentCentroids()

					this.logoEl = document.querySelector('#hero-element')

					// Track logo to h1 element using containerTracker
					this.containerTracker.addTrackedObject('logo', {
						object3D: this.logo,
						htmlContainer: this.logoEl,
						originalDimensions: {
							width: originalWidth,
							height: originalHeight,
						},
						scaleMultiplier: 0.75,
						scalingMode: 'contain',
						offsetZ: 0.75,
					})

					resolve(this.logo)
				},
				undefined,
				(error) => {
					console.error('Error loading logo:', error)
					reject(error)
				}
			)
		})
	}

	createMouseListeners() {
		if (!this.logo || !this.logoFragments.length) return

		this.logoEl.addEventListener('mouseenter', () => {
			if (this.isHovering) return
			this.isHovering = true
			this.explodeFragments()
		})

		this.logoEl.addEventListener('mouseleave', () => {
			if (!this.isHovering) return
			this.isHovering = false
			this.implodeFragments()
		})
	}

	calculateFragmentCentroids() {
		// Calculate centroid for each fragmentGroup
		this.logoChildren.forEach((childData) => {
			const fragmentGroup = childData.fragmentGroup
			const groupFragments = this.logoFragments.filter((frag) =>
				fragmentGroup.children.includes(frag)
			)

			if (groupFragments.length === 0) return

			const centroid = new THREE.Vector3()
			groupFragments.forEach((frag) => {
				centroid.add(frag.userData.initialPosition)
			})
			centroid.divideScalar(groupFragments.length)

			// Store centroid in each fragment
			groupFragments.forEach((frag) => {
				frag.userData.groupCentroid = centroid
			})

			// Also store in childData
			childData.centroid = centroid
		})
	}

	explodeFragments() {
		this.logoFragments.forEach((fragment) => {
			// Calculate direction from the fragment group's centroid to this fragment
			const centroid = fragment.userData.groupCentroid || new THREE.Vector3()
			const direction = fragment.userData.initialPosition
				.clone()
				.sub(centroid)
				.normalize()
			const distance = 4.0

			// Animate fragment outward from its initial position
			gsap.to(fragment.position, {
				x: fragment.userData.initialPosition.x + direction.x * distance,
				y: fragment.userData.initialPosition.y + direction.y * distance,
				z: fragment.userData.initialPosition.z + direction.z * distance,
				duration: 0.6,
				ease: 'power2.out',
			})

			// Random rotation
			gsap.to(fragment.rotation, {
				x: fragment.userData.initialRotation.x + Math.random() * Math.PI,
				y: fragment.userData.initialRotation.y + Math.random() * Math.PI,
				duration: 0.6,
				ease: 'power2.out',
			})
		})
	}

	implodeFragments() {
		this.logoFragments.forEach((fragment) => {
			// Return to original position
			gsap.to(fragment.position, {
				x: fragment.userData.initialPosition.x,
				y: fragment.userData.initialPosition.y,
				z: fragment.userData.initialPosition.z,
				duration: 0.6,
				ease: 'power2.inOut',
			})

			// Return to original rotation
			gsap.to(fragment.rotation, {
				x: fragment.userData.initialRotation.x,
				y: fragment.userData.initialRotation.y,
				z: fragment.userData.initialRotation.z,
				duration: 0.6,
				ease: 'power2.inOut',
			})
		})
	}

	animate(deltaTime) {
		if (this.gradientMaterial) {
			this.gradientMaterial.uniforms.time.value += deltaTime
		}

		// Update transmission material time uniform
		if (this.transmissionMaterial && this.transmissionMaterial.uniforms) {
			this.transmissionMaterial.uniforms.time.value += deltaTime
		}

		// Animate logo children (fragment groups)
		if (this.logoChildren && this.logoChildren.length > 0) {
			const time = this.gradientMaterial
				? this.gradientMaterial.uniforms.time.value
				: 0

			this.logoChildren.forEach((childData) => {
				const {
					fragmentGroup,
					initialPosition,
					initialRotation,
					floatOffset,
					rotateOffset,
				} = childData

				// Float up and down
				const floatSpeed = 0.35
				const floatAmount = 0.2
				fragmentGroup.position.y =
					initialPosition.y +
					Math.sin(time * floatSpeed + floatOffset) * floatAmount

				// Rotate back and forth on Y axis
				const rotateSpeed = 0.35
				const rotateAmount = 0.5
				fragmentGroup.rotation.y =
					initialRotation.y +
					Math.sin(time * rotateSpeed + rotateOffset) * rotateAmount

				// Subtle rotation on X axis
				fragmentGroup.rotation.x =
					initialRotation.x +
					Math.cos(time * rotateSpeed * 0.7 + rotateOffset) *
						(rotateAmount * 0.5)
			})
		}
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}
}

export default HomeScene
