import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Text } from 'three-text/three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import BaseScene from '../base-scene'
import ImageCylinderMaterial from '../materials/image-cylinder-material'
import WhiteBackgroundMaterial from '../materials/white-background-material'
import MeshTransmissionMaterial from '../materials/MeshTransmissionMaterial'
import WebGLText from '../utils/webgl-text'
import BentTextMaterial from '../materials/bent-text-material'

gsap.registerPlugin(ScrollTrigger)

// Set HarfBuzz path for Text
Text.setHarfBuzzPath('/wp-content/themes/startdigital/static/hb/hb.wasm')

class HomeProjectsScene extends BaseScene {
	setupScene() {
		this.scene.background = null
		this.projectsGroup = new THREE.Group()
		this.scene.add(this.projectsGroup)
		this.spiralRadius = 2.2
		this.spiralHeight = 16
		this.scrollProgress = 0
		this.projectTitles = [] // Store WebGLText instances for each project
	}

	createMaterials() {
		// Material for the center cube
		this.cubeMaterial = Object.assign(new MeshTransmissionMaterial(5), {
			_transmission: 1.0,
			chromaticAberration: 0.05,
			roughness: 0.1,
			thickness: 1.4,
			ior: 1.4,
			distortion: 0.5,
			distortionScale: 0.8,
			temporalDistortion: 0.1,
			reflectivity: 0.2,
		})

		this.backgroundMaterial = new WhiteBackgroundMaterial()
	}

	async createObjects() {
		// Create background
		const { width, height } = this.getFrustumDimensions(0)

		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.backgroundMaterial)
		this.background.renderOrder = -1 // Render first, behind everything
		this.scene.add(this.background)

		// Create center cube with rounded edges
		const cubeGeometry = new RoundedBoxGeometry(1.2, 1.2, 1.2, 4, 0.08)
		this.centerCube = new THREE.Mesh(cubeGeometry, this.cubeMaterial)
		this.scene.add(this.centerCube)

		// Create black pyramid inside the cube
		const pyramidGeometry = new THREE.ConeGeometry(0.5, 0.6, 4)
		const pyramidMaterial = new THREE.MeshBasicMaterial({ color: 0x030030 })
		this.pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial)
		this.pyramid.rotation.y = Math.PI / 4 // Rotate 45 degrees for better view
		this.scene.add(this.pyramid) // Add as child of cube

		// Project title text
		this.projectTitleElement = document.querySelector('.project-title .is-h2')
		this.text = new WebGLText(
			this.scene,
			this.camera,
			this.projectTitleElement,
			this.container
		)

		// Get project containers from DOM
		const projectContainers = document.querySelectorAll('.project-container')
		const projectCount = projectContainers.length

		if (projectCount === 0) return

		// Create spiral of projects
		const loadPromises = []

		projectContainers.forEach((container, index) => {
			// Calculate spiral position - each image is 180 degrees from the previous
			const angle = index * Math.PI + Math.PI / 2 // 180 degrees per item
			const t = index / (projectCount - 1 || 1) // Normalize to 0-1 for height
			const height = t * this.spiralHeight - this.spiralHeight / 2

			// Get image
			const img = container.querySelector('img')
			if (!img) return

			// Create group for this project
			const projectGroup = new THREE.Group()

			// Position on spiral
			const x = Math.cos(angle) * this.spiralRadius
			const z = Math.sin(angle) * this.spiralRadius
			const y = height

			projectGroup.position.set(x, y, z)

			// Make it face outward from center (Y rotation only, stay upright)
			projectGroup.rotation.y = Math.atan2(x, z)

			// Load texture from image
			const textureLoader = new THREE.TextureLoader()
			const loadPromise = new Promise((resolve) => {
				textureLoader.load(
					img.src,
					async (texture) => {
						// Create plane with image
						const aspect = 3 / 4
						const planeWidth = 2.3
						const planeHeight = planeWidth / aspect

						const planeGeometry = new THREE.PlaneGeometry(
							planeWidth,
							planeHeight,
							10,
							10
						)
						const planeMaterial = new ImageCylinderMaterial({
							uTexture: texture,
							uTextureSize: new THREE.Vector2(
								img.naturalWidth,
								img.naturalHeight
							),
							uQuadSize: new THREE.Vector2(planeWidth, planeHeight),
							uRadius: 2.5,
							uScrollVelocity: 0,
							side: THREE.DoubleSide,
							uBackColor: new THREE.Color('#EAEAEA'),
						})

						const plane = new THREE.Mesh(planeGeometry, planeMaterial)
						projectGroup.add(plane)

						// Add project title and subtitle at the bottom of the plane
						const titleElement = container.querySelector('[project-grid-title]')
						const subtitleElement = container.querySelector(
							'[project-grid-subtitle]'
						)

						if (titleElement && titleElement.textContent) {
							try {
								// Create group for all text
								const textGroup = new THREE.Group()

								// === TITLE ===
								const titleSize = 0.15

								const titleResult = await Text.create({
									text: titleElement.textContent.trim(),
									font: '/wp-content/themes/startdigital/static/fonts/montreal-medium.ttf',
									size: titleSize,
									letterSpacing: -0.05,
									depth: 0.001,
									embolden: 0.3, // Thicken the text (0.0 - 1.0)
									layout: {
										width: 1.5,
										align: 'center',
									},
								})

								const titleMaterial = new BentTextMaterial({
									uRadius: 0.5,
								})

								const titleMesh = new THREE.Mesh(
									titleResult.geometry,
									titleMaterial
								)

								// Get title height
								titleResult.geometry.computeBoundingBox()
								const titleBbox = titleResult.geometry.boundingBox
								const titleHeight = titleBbox.max.y - titleBbox.min.y

								textGroup.add(titleMesh)

								if (subtitleElement && subtitleElement.textContent) {
									const subtitleSize = 0.06 // Smaller than title

									const subtitleResult = await Text.create({
										text: subtitleElement.textContent.trim().toUpperCase(),
										font: '/wp-content/themes/startdigital/static/fonts/montreal-semibold.ttf',
										size: subtitleSize,
										letterSpacing: -0.02,
										depth: 0.001,
										layout: {
											width: 1.5,
											align: 'center',
										},
									})

									const subtitleMaterial = new BentTextMaterial({
										uRadius: 0.5,
										uColor: new THREE.Color('#B7B6C8'),
									})

									const subtitleMesh = new THREE.Mesh(
										subtitleResult.geometry,
										subtitleMaterial
									)

									// Get subtitle height
									subtitleResult.geometry.computeBoundingBox()

									// Position subtitle below title
									subtitleMesh.position.y = -(titleHeight + 0.04) // Small gap between title and subtitle

									textGroup.add(subtitleMesh)
								}

								// Position from bottom of text geometry
								// Place the bottom of the text at the desired position
								const titleOffset = -planeHeight / 2 + 0.3 // Where we want the bottom of text
								textGroup.position.y = titleOffset + titleHeight // Offset by text height
								textGroup.position.z = 0.1 // Forward for visibility

								// Add to project group and store reference
								projectGroup.add(textGroup)
								this.projectTitles.push(textGroup)
							} catch (error) {
								console.error('Error creating text:', error)
							}
						}

						resolve()
					},
					undefined,
					(error) => {
						console.error('Error loading texture:', error)
						resolve()
					}
				)
			})

			loadPromises.push(loadPromise)

			this.projectsGroup.add(projectGroup)
		})

		// Wait for all textures to load
		await Promise.all(loadPromises)

		this.setupScrollAnimation()
	}

	setupScrollAnimation() {
		const container = document.querySelector('#home-projects-inner')
		if (!container) return

		const projectCount = this.projectsGroup.children.length
		// Add extra rotations to fill the extended scroll range
		const totalRotations = projectCount / 2 + 1 // Add 1 extra rotation

		// Extend the vertical movement range to match - reduce extension for better sync
		const heightExtension = this.spiralHeight * 0.2 // 25% extension on each end
		const startGroupY = -this.spiralHeight / 2 - heightExtension // Start higher
		const endGroupY = this.spiralHeight / 2 + heightExtension // End lower

		// Animate the entire projects group rotation
		this.tl = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				start: 'top bottom',
				end: 'bottom top',
				scrub: true,
				ease: 'none',
			},
		})

		// Rotate the group and move it vertically simultaneously
		this.tl
			.fromTo(
				this.projectsGroup.rotation,
				{ y: 0 },
				{
					y: Math.PI * 2 * totalRotations - Math.PI, // Full rotations needed
					ease: 'none',
				},
				0
			)
			.fromTo(
				this.projectsGroup.position,
				{ y: startGroupY }, // Start at top
				{
					y: endGroupY, // Move to bottom
					ease: 'none',
				},
				0
			)

		this.tl2 = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				start: 'top top',
				end: 'bottom bottom',
				scrub: true,
				ease: 'none',
				onUpdate: (self) => {
					this.scrollProgress = self.progress
					this.backgroundMaterial.uniforms.uScroll.value = -self.progress * 2.0
				},
			},
		})
	}

	animate(deltaTime) {
		if (!this.isVisible) return

		this.time += deltaTime

		// Rotate center cube
		if (this.centerCube) {
			this.centerCube.rotation.x += deltaTime * 0.3
			this.centerCube.rotation.y += deltaTime * 0.4
			this.centerCube.rotation.z += deltaTime * 0.1
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

export default HomeProjectsScene
