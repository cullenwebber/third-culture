import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
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

		// Add fog for the flowing rectangles to disappear into
		this.scene.fog = new THREE.Fog(0x0a0a1a, 0, 35)

		// Animation timescale for smooth transitions
		this.animationSpeed = 1
	}

	createMaterials() {
		const { width: canvasWidth, height: canvasHeight } =
			this.container.getBoundingClientRect()
		this.gradientMaterial = new GradientMaterial()
		this.gradientMaterial.uniforms.resolution.value.set(
			canvasWidth,
			canvasHeight
		)

		this.transmissionMaterial = Object.assign(new MeshTransmissionMaterial(3), {
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

			.fromTo(
				this.gradientMaterial.uniforms.progress,
				{
					value: 0.5,
				},
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

		// Make background much larger and push it back so rectangles can flow in front
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

		// Load the wordmark SVG
		this.loadWordmark()

		this.scene.add(this.background)

		// Setup scroll animation after everything is created
		this.setupScrollAnimation()
	}

	async loadLogo() {
		const path = getStaticPath('/cube-and-triangle.glb')

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

						// child.scale.z = 0.25
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
						scaleMultiplier: 0.9,
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

	loadWordmark() {
		const heroSvgContainer = document.querySelector('#hero-svg')
		if (!heroSvgContainer) return

		const svgElement = heroSvgContainer.querySelector('svg')
		if (!svgElement) return

		// Get SVG content as string
		const svgString = new XMLSerializer().serializeToString(svgElement)

		// Parse SVG
		const loader = new SVGLoader()
		const svgData = loader.parse(svgString)

		// Create group for the wordmark
		this.wordmark = new THREE.Group()

		// Get SVG viewBox dimensions
		const viewBox = svgElement.viewBox.baseVal
		const svgWidth = viewBox.width || 1504
		const svgHeight = viewBox.height || 234

		// Create meshes from paths
		svgData.paths.forEach((path) => {
			const shapes = SVGLoader.createShapes(path)

			shapes.forEach((shape) => {
				const geometry = new THREE.ShapeGeometry(shape)
				const mesh = new THREE.Mesh(
					geometry,
					new THREE.MeshBasicMaterial({
						color: 0xffffff,
						side: THREE.DoubleSide,
					})
				)
				this.wordmark.add(mesh)
			})
		})

		// Center the wordmark
		const bbox = new THREE.Box3().setFromObject(this.wordmark)
		const center = bbox.getCenter(new THREE.Vector3())
		this.wordmark.children.forEach((child) => {
			child.position.x -= center.x
			child.position.y -= center.y
		})

		// Flip Y axis (SVG has inverted Y)

		this.scene.add(this.wordmark)

		// Track wordmark to the hero-svg container
		this.containerTracker.addTrackedObject('wordmark', {
			object3D: this.wordmark,
			htmlContainer: heroSvgContainer,
			originalDimensions: {
				width: svgWidth,
				height: svgHeight,
			},
			scaleMultiplier: 1.0,
			scalingMode: 'width',
			offsetZ: 0,
		})

		this.wordmark.rotation.x = Math.PI

		svgElement.style.opacity = 0
	}

	createMouseListeners() {
		if (!this.logo || !this.logoFragments.length) return

		this.logoEl.addEventListener('mouseenter', () => {
			if (this.isHovering) return
			this.isHovering = true
			this.explodeFragments()

			// Slow down animation
			gsap.to(this, {
				animationSpeed: 0,
				duration: 0.4,
				ease: 'power2.out',
			})
		})

		this.logoEl.addEventListener('mouseleave', () => {
			if (!this.isHovering) return
			this.isHovering = false
			this.implodeFragments()

			// Speed up animation
			gsap.to(this, {
				animationSpeed: 1,
				duration: 0.6,
				ease: 'power2.inOut',
			})
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
		this.explosionComplete = false
		this.floatStarted = false
		this.floatAmplitude = 0

		this.logoFragments.forEach((fragment, i) => {
			// Calculate direction from the fragment group's centroid to this fragment
			const centroid = fragment.userData.groupCentroid || new THREE.Vector3()
			const direction = fragment.userData.initialPosition
				.clone()
				.sub(centroid)
				.normalize()
			const distance = 1.2

			// Calculate and store target exploded position
			const targetX =
				fragment.userData.initialPosition.x +
				direction.x * distance * 0.5 +
				direction.x * distance * 1.5 * Math.random()
			const targetY =
				fragment.userData.initialPosition.y +
				direction.y * distance * 0 +
				direction.y * distance * 1.5 * Math.random()
			const targetZ =
				fragment.userData.initialPosition.z -
				distance * 1.5 +
				distance * 3.0 * Math.random()

			fragment.userData.explodedPosition = new THREE.Vector3(
				targetX,
				targetY,
				targetZ
			)
			fragment.userData.fragmentFloatOffset = Math.random() * Math.PI * 2

			// Animate fragment outward from its initial position
			gsap.to(fragment.position, {
				x: targetX,
				y: targetY,
				z: targetZ,
				duration: 0.6,
				ease: 'power2.out',
				onComplete: () => {
					if (i === this.logoFragments.length - 1) {
						this.explosionComplete = true
					}
				},
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

			const speed = this.animationSpeed ?? 1

			this.logoChildren.forEach((childData) => {
				const {
					fragmentGroup,
					initialPosition,
					initialRotation,
					floatOffset,
					rotateOffset,
				} = childData

				// Float up and down
				const floatSpeed = 0.65
				const floatAmount = 0.2 * speed
				fragmentGroup.position.y =
					initialPosition.y +
					Math.sin(time * floatSpeed + floatOffset) * floatAmount

				// Rotate back and forth on Y axis
				const rotateSpeed = 0.65
				const rotateAmount = 0.4 * speed
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

		// Animate individual fragments when hovering (only after explosion completes)
		if (
			this.isHovering &&
			this.explosionComplete &&
			this.logoFragments &&
			this.logoFragments.length > 0
		) {
			const globalTime = this.gradientMaterial
				? this.gradientMaterial.uniforms.time.value
				: 0

			// Capture all positions and rotations at once on first frame after explosion
			if (!this.floatStarted) {
				this.floatStarted = true
				this.floatStartTime = globalTime
				this.logoFragments.forEach((fragment) => {
					fragment.userData.explodedPosition = fragment.position.clone()
					fragment.userData.explodedRotation = fragment.rotation.clone()
				})
				// Ease in the float amplitude
				gsap.to(this, {
					floatAmplitude: 1,
					duration: 1.25,
					ease: 'power2.out',
				})
			}

			// Use time relative to when float started, so sin begins at 0
			const time = globalTime - this.floatStartTime
			const amplitude = this.floatAmplitude ?? 0

			this.logoFragments.forEach((fragment) => {
				if (!fragment.userData.explodedPosition) return

				// Use offset for speed variation instead of phase offset
				const speedVariation = 0.1 + fragment.userData.fragmentFloatOffset * 0.1
				const floatAmount = 0.1 * amplitude
				const rotateAmount = 0.4 * amplitude

				// Float each fragment individually - all start from sin(0) = 0
				fragment.position.y =
					fragment.userData.explodedPosition.y +
					Math.sin(time * speedVariation) * floatAmount

				// Use sin for X too so it also starts at 0
				fragment.position.x =
					fragment.userData.explodedPosition.x +
					Math.sin(time * speedVariation * 0.7) * floatAmount * 0.5

				// Slight rotation
				fragment.rotation.x =
					fragment.userData.explodedRotation.x +
					Math.sin(time * speedVariation * 0.5) * rotateAmount

				fragment.rotation.y =
					fragment.userData.explodedRotation.y +
					Math.sin(time * speedVariation * 0.6) * rotateAmount
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
