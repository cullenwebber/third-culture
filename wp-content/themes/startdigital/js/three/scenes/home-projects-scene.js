import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import BaseScene from '../base-scene'
import ImageCylinderMaterial from '../materials/image-cylinder-material'
import WhiteBackgroundMaterial from '../materials/white-background-material'
import MeshTransmissionMaterial from '../materials/MeshTransmissionMaterial'
import { isLowPowerDevice } from '../../utils/device-capability'
import WebGLText from '../utils/webgl-text'
import BentTextMaterial from '../materials/bent-text-material'
import { createText, createTextMesh } from '../utils/text-factory'

gsap.registerPlugin(ScrollTrigger)

class HomeProjectsScene extends BaseScene {
	setupScene() {
		this.scene.background = null
		this.projectsGroup = new THREE.Group()
		this.scene.add(this.projectsGroup)
		this.spiralRadius = 2.2
		this.projectSpacing = 3.5 // Vertical spacing between each project
		this.scrollProgress = 0
		this.projectTitles = [] // Store WebGLText instances for each project
		this.projectPlanes = [] // Store project planes for hover effect

		// Mouse tracking
		this.mouse = new THREE.Vector2(9999, 9999)
		this.raycaster = new THREE.Raycaster()
		this.hoveredProject = null
	}

	createMaterials() {
		// Use simpler material on low-power devices for performance
		if (isLowPowerDevice()) {
			this.cubeMaterial = new THREE.MeshPhysicalMaterial({
				color: '#ffffff',
				transmission: 1.0,
				roughness: 0.1,
				thickness: 1.4,
				ior: 1.4,
				reflectivity: 0.2,
			})
		} else {
			this.cubeMaterial = Object.assign(new MeshTransmissionMaterial(1), {
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
			this.cubeMaterial.gritAmount = 0.1
			this.cubeMaterial.gritScale = 100.0
		}

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

		// Calculate spiral height based on number of projects
		this.spiralHeight = (projectCount - 1) * this.projectSpacing

		// Create spiral of projects
		const loadPromises = []

		// Calculate starting angle so the top project is always at the same position
		const targetTopAngle = Math.PI / 2 // Desired angle for the top project (90 degrees)
		const topProjectIndex = projectCount - 1
		const startAngle = targetTopAngle - topProjectIndex * Math.PI

		projectContainers.forEach((container, index) => {
			// Calculate spiral position - each image is 180 degrees from the previous
			const angle = index * Math.PI + startAngle // 180 degrees per item
			const height = index * this.projectSpacing - this.spiralHeight / 2

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

						// Get link from container - check if container is a link or contains one
						let link = null
						if (container.tagName === 'A') {
							link = container.href
						} else {
							const linkElement = container.querySelector('a')
							link = linkElement ? linkElement.href : null
						}

						// Store plane for hover effect and click
						this.projectPlanes.push({
							plane,
							material: planeMaterial,
							link,
							container,
						})

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

								const titleResult = await createText({
									text: titleElement.textContent.trim(),
									font: '/wp-content/themes/startdigital/static/fonts/montreal-medium.ttf',
									size: titleSize,
									letterSpacing: -0.05,
									depth: 0.001,
									embolden: 0.3,
									color: 0xffffff,
									layout: {
										width: 1.5,
										align: 'center',
									},
								})

								// Use BentTextMaterial for 3D text (troika handles its own material)
								const titleMaterial = new BentTextMaterial({ uRadius: 0.5 })

								const titleMesh = createTextMesh(titleResult, titleMaterial)

								// Get title height
								titleResult.geometry.computeBoundingBox()
								const titleBbox = titleResult.geometry.boundingBox
								const titleHeight = titleBbox.max.y - titleBbox.min.y

								textGroup.add(titleMesh)

								if (subtitleElement && subtitleElement.textContent) {
									const subtitleSize = 0.06

									const subtitleResult = await createText({
										text: subtitleElement.textContent.trim().toUpperCase(),
										font: '/wp-content/themes/startdigital/static/fonts/montreal-semibold.ttf',
										size: subtitleSize,
										letterSpacing: -0.02,
										depth: 0.001,
										color: 0xb7b6c8,
										layout: {
											width: 1.5,
											align: 'center',
										},
									})

									const subtitleMaterial = new BentTextMaterial({
										uRadius: 0.5,
										uColor: new THREE.Color('#B7B6C8'),
									})

									const subtitleMesh = createTextMesh(
										subtitleResult,
										subtitleMaterial
									)

									// Position subtitle below title
									subtitleMesh.position.y = -(titleHeight + 0.04)

									textGroup.add(subtitleMesh)
								}

								// Position from bottom of text geometry
								const titleOffset = -planeHeight / 2 + 0.3
								textGroup.position.y = titleOffset + titleHeight
								textGroup.position.z = 0.1

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
		this.createMouseListeners()
	}

	setupScrollAnimation() {
		const container = document.querySelector('#home-projects-inner')
		if (!container) return

		const projectCount = this.projectsGroup.children.length

		// Content spans (projectCount - 1) gaps, plus extra at each end
		const totalRotation = (projectCount - 1) * Math.PI

		const startRotation = 0
		const endRotation = startRotation + totalRotation

		const startY = -this.spiralHeight / 2
		const endY = this.spiralHeight / 2

		// Calculate relative durations for each phase based on scroll distances
		const viewportHeight = window.innerHeight
		const containerHeight = container.offsetHeight

		const phase1Duration = viewportHeight // top bottom -> top top
		const phase2Duration = containerHeight - viewportHeight // top top -> bottom bottom
		const phase3Duration = viewportHeight // bottom bottom -> bottom top

		const { height } = this.getFrustumDimensions()

		this.tl = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				start: 'top bottom',
				end: 'bottom top',
				scrub: true,
				ease: 'none',
			},
		})

		// Phase 1: Intro rotation (top bottom -> top top)
		this.tl.fromTo(
			this.projectsGroup.rotation,
			{ y: -Math.PI },
			{ y: startRotation, ease: 'none', duration: phase1Duration },
			0
		)

		this.tl.fromTo(
			this.projectsGroup.position,
			{ y: startY - this.projectSpacing },
			{ y: startY, ease: 'none', duration: phase1Duration },
			'<='
		)

		this.tl.fromTo(
			this.centerCube.position,
			{ y: height },
			{ y: 0, ease: 'none', duration: phase1Duration },
			'<='
		)
		this.tl.fromTo(
			this.pyramid.position,
			{ y: height },
			{ y: 0, ease: 'none', duration: phase1Duration },
			'<='
		)

		let that = this
		// Phase 2: Main animation (top top -> bottom bottom)
		this.tl.to(this.projectsGroup.rotation, {
			y: endRotation,
			ease: 'none',
			duration: phase2Duration,
			onUpdate: function () {
				const progress = this.progress()
				that.backgroundMaterial.uniforms.uScroll.value = -progress * 1.0
			},
		})

		this.tl.fromTo(
			this.projectsGroup.position,
			{ y: startY },
			{ y: endY, ease: 'none', duration: phase2Duration },
			'<='
		)

		// Phase 3: Outro rotation (bottom bottom -> bottom top)
		this.tl.to(this.projectsGroup.rotation, {
			y: endRotation + Math.PI,
			ease: 'none',
			duration: phase3Duration,
		})

		this.tl.fromTo(
			this.projectsGroup.position,
			{ y: endY },
			{ y: endY + this.projectSpacing, ease: 'none', duration: phase3Duration },
			'<='
		)

		this.tl.fromTo(
			this.centerCube.position,
			{ y: 0 },
			{ y: -height, ease: 'none', duration: phase1Duration },
			'<='
		)
		this.tl.fromTo(
			this.pyramid.position,
			{ y: 0 },
			{ y: -height, ease: 'none', duration: phase1Duration },
			'<='
		)
	}

	createMouseListeners() {
		this.onMouseMove = (event) => {
			const rect = this.container.getBoundingClientRect()
			this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
			this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
		}

		this.onClick = (event) => {
			if (this.hoveredProject && this.hoveredProject.link) {
				window.location.href = this.hoveredProject.link
			}
		}

		window.addEventListener('mousemove', this.onMouseMove)
		document
			.querySelector('#home-projects-inner')
			.addEventListener('click', this.onClick)
	}

	updateHover() {
		if (this.projectPlanes.length === 0) return

		// Update raycaster
		this.raycaster.setFromCamera(this.mouse, this.camera)

		// Check for intersections - raycast recursively through group hierarchy
		const intersects = this.raycaster.intersectObjects(
			this.projectsGroup.children,
			true
		)

		// Filter for only our plane meshes
		const planeIntersects = intersects.filter((intersect) => {
			return this.projectPlanes.some((p) => p.plane === intersect.object)
		})

		if (planeIntersects.length > 0) {
			const intersectedPlane = planeIntersects[0].object
			const projectData = this.projectPlanes.find(
				(p) => p.plane === intersectedPlane
			)

			if (projectData && projectData !== this.hoveredProject) {
				// Unhover previous
				if (this.hoveredProject) {
					gsap.to(this.hoveredProject.material.uniforms.uBulge, {
						value: 0,
						duration: 0.4,
						ease: 'power2.out',
					})
				}

				// Hover new
				this.hoveredProject = projectData

				// Update cursor
				document.body.style.cursor = 'pointer'

				// Update mouse position in UV space
				const uv = planeIntersects[0].uv
				if (uv) {
					projectData.material.uniforms.uMouse.value.set(uv.x, uv.y)
				}

				gsap.to(projectData.material.uniforms.uBulge, {
					value: 1,
					duration: 0.4,
					ease: 'power2.out',
				})
			} else if (projectData) {
				// Update mouse position
				const uv = planeIntersects[0].uv
				if (uv) {
					projectData.material.uniforms.uMouse.value.set(uv.x, uv.y)
				}
			}
		} else {
			// No intersection - unhover
			if (this.hoveredProject) {
				gsap.to(this.hoveredProject.material.uniforms.uBulge, {
					value: 0,
					duration: 0.4,
					ease: 'power2.out',
				})
				this.hoveredProject = null

				// Reset cursor
				document.body.style.cursor = ''
			}
		}
	}

	animate(deltaTime) {
		if (!this.isVisible) return

		this.time += deltaTime

		// Update hover effect
		this.updateHover()

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

	adjustCamera() {
		// Move camera back on mobile
		const isMobile = window.innerWidth < 640
		const cameraDistance = isMobile ? 5.5 : 5
		this.camera.position.z = cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	onResize(width, height) {
		super.onResize(width, height)

		// Adjust camera for mobile
		this.adjustCamera()

		// Update background plane to fill viewport
		if (this.background) {
			const { width: frustumWidth, height: frustumHeight } =
				this.getFrustumDimensions(0)
			this.background.geometry.dispose()
			this.background.geometry = new THREE.PlaneGeometry(
				frustumWidth,
				frustumHeight,
				1,
				1
			)
		}

		// Update background material aspect ratio
		if (this.backgroundMaterial) {
			this.backgroundMaterial.uniforms.aspectRatio.value =
				window.innerWidth / window.innerHeight
		}

		// Update text
		if (this.text) {
			this.text.resize()
		}

		// Refresh scroll trigger to recalculate positions
		if (this.tl && this.tl.scrollTrigger) {
			this.tl.scrollTrigger.refresh()
		}
	}

	dispose() {
		// Remove mouse listeners
		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
		}
		if (this.onClick) {
			this.container.removeEventListener('click', this.onClick)
		}

		// Reset cursor
		if (this.container) {
			this.container.style.cursor = ''
		}

		super.dispose()
	}
}

export default HomeProjectsScene
