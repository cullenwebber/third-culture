import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import BaseScene from '../base-scene'
import ImageCylinderMaterial from '../materials/image-cylinder-material'
import WhiteBackgroundMaterial from '../materials/white-background-material'
import BentTextMaterial from '../materials/bent-text-material'
import { getLenis } from '../../utils/smooth-scroll'
import { createText, createTextMesh } from '../utils/text-factory'

gsap.registerPlugin(ScrollTrigger)

class NewsScene extends BaseScene {
	setupScene() {
		this.scene.background = null
		this.rings = []
		this.newsPlanes = []
		this.newsTitles = []
		this.time = 0
		this.direction = 1
		this.lenis = getLenis()

		// Ring configuration
		this.ringCount = 4
		this.ringRadius = 4.5
		this.ringSpacing = 2.85
		this.rotationSpeeds = [0.2, 0.1, 0.2, 0.1]
		this.duplicateImages = 3

		// Mouse tracking
		this.mouse = new THREE.Vector2(9999, 9999)
		this.raycaster = new THREE.Raycaster()
		this.hoveredNews = null
	}

	createMaterials() {
		this.backgroundMaterial = new WhiteBackgroundMaterial()
	}

	async createObjects() {
		// Create background
		const { width, height } = this.getFrustumDimensions(0)
		const bgGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(bgGeometry, this.backgroundMaterial)
		this.background.renderOrder = -1
		this.scene.add(this.background)

		// Create container for all rings
		this.ringsContainer = new THREE.Group()
		this.ringsContainer.position.z = this.camera.position.z
		this.scene.add(this.ringsContainer)

		// Get news images from DOM
		const newsImages = document.querySelectorAll('[data-news-image]')
		if (newsImages.length === 0) return

		const imageArray = Array.from(newsImages)
		const duplicatedImages = []
		for (let i = 0; i < this.duplicateImages; i++) {
			duplicatedImages.push(...imageArray)
		}

		const planeWidth = 1.8
		const planeHeight = planeWidth / (3 / 4)

		// Load textures first (only unique ones)
		const textureLoader = new THREE.TextureLoader()
		const texturePromises = imageArray.map(
			(img) =>
				new Promise((resolve) => {
					textureLoader.load(
						img.src,
						(texture) => resolve({ img, texture }),
						undefined,
						() => resolve({ img, texture: null })
					)
				})
		)

		const loadedTextures = await Promise.all(texturePromises)
		const textureMap = new Map()
		loadedTextures.forEach(({ img, texture }) => {
			if (texture) textureMap.set(img.src, { texture, img })
		})

		// Create 4 rings
		for (let ringIndex = 0; ringIndex < this.ringCount; ringIndex++) {
			const ring = new THREE.Group()
			const imagesPerRing = duplicatedImages.length
			const angleStep = (Math.PI * 2) / imagesPerRing

			const ringY = (ringIndex - (this.ringCount - 1) / 2) * this.ringSpacing
			ring.position.y = ringY
			ring.rotation.y = (ringIndex * Math.PI) / this.ringCount

			for (
				let imageIndex = 0;
				imageIndex < duplicatedImages.length;
				imageIndex++
			) {
				const img = duplicatedImages[imageIndex]
				const angle = imageIndex * angleStep
				const textureData = textureMap.get(img.src)

				if (!textureData) continue

				const { texture } = textureData

				// Create card group
				const cardGroup = new THREE.Group()

				// Create material (unique per card for hover)
				const planeMaterial = new ImageCylinderMaterial({
					uTexture: texture,
					uTextureSize: new THREE.Vector2(img.naturalWidth, img.naturalHeight),
					uQuadSize: new THREE.Vector2(planeWidth, planeHeight),
					uRadius: -3.8,
					uScrollVelocity: 0,
					side: THREE.DoubleSide,
					uBackColor: new THREE.Color('#EAEAEA'),
				})

				const planeGeometry = new THREE.PlaneGeometry(
					planeWidth,
					planeHeight,
					10,
					10
				)
				const plane = new THREE.Mesh(planeGeometry, planeMaterial)
				cardGroup.add(plane)

				// Position on ring
				const x = Math.cos(angle) * this.ringRadius
				const z = Math.sin(angle) * this.ringRadius

				cardGroup.position.set(x, 0, z)
				cardGroup.rotation.y = Math.atan2(x, z) + Math.PI

				// Get link info
				const newsItem = img.closest('a')
				const link = newsItem ? newsItem.href : null
				const titleElement = newsItem?.querySelector('h5')
				const categoryElement = newsItem?.querySelector('[data-news-category]')

				// Add text
				if (titleElement && titleElement.textContent) {
					try {
						const textGroup = new THREE.Group()

						const titleSize = 0.12
						const titleResult = await createText({
							text: titleElement.textContent.trim(),
							font: '/wp-content/themes/startdigital/static/fonts/montreal-medium.ttf',
							size: titleSize,
							letterSpacing: -0.03,
							depth: 0.001,
							embolden: 0.3,
							color: 0xffffff,
							layout: {
								width: planeWidth * 0.85,
								align: 'center',
							},
						})

						const titleMaterial = new BentTextMaterial({ uRadius: -0.2 })
						const titleMesh = createTextMesh(titleResult, titleMaterial)

						titleResult.geometry.computeBoundingBox()
						const titleBbox = titleResult.geometry.boundingBox
						const titleHeight = titleBbox.max.y - titleBbox.min.y

						if (!titleResult.isTroika) {
							const horizontalCenter = (titleBbox.max.x + titleBbox.min.x) / 2
							const verticalCenter = (titleBbox.max.y + titleBbox.min.y) / 2
							titleMesh.position.set(-horizontalCenter, -verticalCenter, 0)
						}

						textGroup.add(titleMesh)

						if (categoryElement && categoryElement.textContent) {
							const categorySize = 0.06
							const categoryResult = await createText({
								text: categoryElement.textContent.trim().toUpperCase(),
								font: '/wp-content/themes/startdigital/static/fonts/montreal-semibold.ttf',
								size: categorySize,
								letterSpacing: -0.02,
								depth: 0.001,
								color: 0xb7b6c8,
								layout: {
									width: planeWidth * 0.85,
									align: 'center',
								},
							})

							const categoryMaterial = new BentTextMaterial({
								uRadius: -0.2,
								uColor: new THREE.Color('#B7B6C8'),
							})
							const categoryMesh = createTextMesh(
								categoryResult,
								categoryMaterial
							)

							if (!categoryResult.isTroika) {
								categoryResult.geometry.computeBoundingBox()
								const categoryBbox = categoryResult.geometry.boundingBox
								const catHorizontalCenter =
									(categoryBbox.max.x + categoryBbox.min.x) / 2
								const catVerticalCenter =
									(categoryBbox.max.y + categoryBbox.min.y) / 2
								categoryMesh.position.set(
									-catHorizontalCenter,
									-catVerticalCenter,
									0
								)
							}

							categoryMesh.position.y -= titleHeight + 0.04
							textGroup.add(categoryMesh)
						}

						const titleOffset = -planeHeight / 2 + 0.3
						textGroup.position.y = titleOffset + titleHeight
						textGroup.position.z = 0.05

						cardGroup.add(textGroup)
						this.newsTitles.push(textGroup)
					} catch (error) {
						console.error('Error creating text:', error)
					}
				}

				ring.add(cardGroup)

				this.newsPlanes.push({
					plane,
					material: planeMaterial,
					link,
					ringIndex,
				})
			}

			this.rings.push(ring)
			this.ringsContainer.add(ring)
		}

		this.setupScrollAnimation()
		this.createMouseListeners()
	}

	setupScrollAnimation() {
		const container = document.querySelector('#news-scene-wrapper')
		if (!container) return

		const totalRingHeight = (this.ringCount + 1) * this.ringSpacing
		const that = this

		const viewportHeight = window.innerHeight
		const containerHeight = container.offsetHeight

		const phase1Duration = viewportHeight
		const phase2Duration = containerHeight - viewportHeight
		const phase3Duration = viewportHeight

		this.tl = gsap.timeline({
			scrollTrigger: {
				trigger: container,
				start: 'top bottom',
				end: 'bottom top',
				scrub: true,
				ease: 'none',
			},
		})

		this.tl.fromTo(
			this.ringsContainer.position,
			{ y: -totalRingHeight * 0.35 },
			{ y: -totalRingHeight * 0.35, ease: 'none', duration: phase1Duration },
			0
		)

		this.tl.to(this.ringsContainer.position, {
			y: totalRingHeight * 0.3,
			ease: 'none',
			duration: phase2Duration,
			onUpdate: function () {
				const progress = this.progress()
				that.backgroundMaterial.uniforms.uScroll.value = -progress * 1.0
			},
		})

		this.tl.to(this.ringsContainer.position, {
			y: totalRingHeight * 0.35,
			ease: 'none',
			duration: phase3Duration,
		})
	}

	createMouseListeners() {
		this.onMouseMove = (event) => {
			const rect = this.container.getBoundingClientRect()
			this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
			this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
		}

		this.onClick = () => {
			if (this.hoveredNews && this.hoveredNews.link) {
				window.location.href = this.hoveredNews.link
			}
		}

		window.addEventListener('mousemove', this.onMouseMove)
		this.container.addEventListener('click', this.onClick)
	}

	updateHover() {
		if (this.newsPlanes.length === 0) return

		this.raycaster.setFromCamera(this.mouse, this.camera)

		const planes = this.newsPlanes.map((p) => p.plane)
		const intersects = this.raycaster.intersectObjects(planes)

		if (intersects.length > 0) {
			const intersectedPlane = intersects[0].object
			const newsData = this.newsPlanes.find((p) => p.plane === intersectedPlane)

			if (newsData && newsData !== this.hoveredNews) {
				if (this.hoveredNews) {
					gsap.to(this.hoveredNews.material.uniforms.uBulge, {
						value: 0,
						duration: 0.4,
						ease: 'power2.out',
					})
				}

				this.hoveredNews = newsData
				document.body.style.cursor = 'pointer'

				const uv = intersects[0].uv
				if (uv) {
					newsData.material.uniforms.uMouse.value.set(uv.x, uv.y)
				}

				gsap.to(newsData.material.uniforms.uBulge, {
					value: 1,
					duration: 0.4,
					ease: 'power2.out',
				})
			} else if (newsData) {
				const uv = intersects[0].uv
				if (uv) {
					newsData.material.uniforms.uMouse.value.set(uv.x, uv.y)
				}
			}
		} else {
			if (this.hoveredNews) {
				gsap.to(this.hoveredNews.material.uniforms.uBulge, {
					value: 0,
					duration: 0.4,
					ease: 'power2.out',
				})
				this.hoveredNews = null
				document.body.style.cursor = ''
			}
		}
	}

	animate(deltaTime) {
		if (!this.isVisible) return

		this.time += deltaTime

		const velocity = this.lenis?.velocity || 0
		this.direction = velocity < 0 ? -1 : velocity > 0 ? 1 : this.direction

		this.rings.forEach((ring, index) => {
			ring.rotation.y +=
				(this.direction * deltaTime * this.rotationSpeeds[index] +
					velocity * 0.00065) *
				(index % 2 == 0 ? -1 : 1)
		})

		this.updateHover()
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}

	onResize(width, height) {
		super.onResize(width, height)

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

		if (this.backgroundMaterial) {
			this.backgroundMaterial.uniforms.aspectRatio.value =
				window.innerWidth / window.innerHeight
		}

		if (this.tl && this.tl.scrollTrigger) {
			this.tl.scrollTrigger.refresh()
		}
	}

	dispose() {
		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
		}
		if (this.onClick) {
			this.container.removeEventListener('click', this.onClick)
		}

		document.body.style.cursor = ''

		super.dispose()
	}
}

export default NewsScene
