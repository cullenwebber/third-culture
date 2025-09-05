import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

class ProjectsScrollTrigger {
	constructor(scene) {
		this.scene = scene
		this.splitTextContent = []
		this.splitTextHeading = []
		this.projectsTextContainer = document.querySelectorAll('[data-project]')
		this.init()
	}

	init() {
		this.splitText()
		this.registerInitialStates()
		this.registerScrolltrigger()
		this.registerAnimations()
	}

	splitText() {
		this.projectsTextContainer.forEach((textEl, i) => {
			const headingEl = textEl.querySelector('[data-project-title]')
			const linkEl = textEl.querySelector('[data-project-link]')

			const paragraphEl = textEl.querySelector('[data-project-content] > p')
			const splitText = SplitText.create(paragraphEl, {
				type: 'lines',
				mask: 'lines',
			})

			const splitHeading = SplitText.create(headingEl, {
				type: 'lines',
				mask: 'lines',
			})

			gsap.set([splitHeading.lines, splitText.lines, linkEl], {
				opacity: i === 0 ? 1 : 0,
			})

			this.splitTextHeading.push(splitHeading)
			this.splitTextContent.push(splitText)
		})
	}

	registerInitialStates() {
		const radius = this.scene.radius
		const totalAngle = Math.PI * 0.35
		const angleStep =
			totalAngle / Math.max(1, this.scene.imagePlanes.length - 1)
		const startAngle = -totalAngle

		this.initialState = {
			imagePlanesData: this.scene.imagePlanes.map((imagePlane, i) => {
				const box = new THREE.Box3().setFromObject(imagePlane)
				const angle = startAngle + i * angleStep

				return {
					positionY: imagePlane.position.y,
					positionZ: imagePlane.position.z,
					rotationX: imagePlane.rotation.x,
					height: box.max.y - box.min.y,
					width: box.max.x - box.min.x,
					initialAngle: angle,
					radius: radius,
				}
			}),
			radius,
			totalAngle,
			angleStep,
			startAngle,
		}
	}

	registerScrolltrigger() {
		this.projectsTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#home-projects-scroller',
				start: 'top top',
				end: 'bottom bottom',
				pin: false,
				scrub: true,
			},
		})
	}

	registerAnimations() {
		const that = this
		let previousMostVisibleIndex = 0

		this.projectsTl.to(
			{},
			{
				onUpdate: function () {
					const progress = this.progress()
					const totalPlanes = that.scene.imagePlanes.length

					let mostVisibleIndex = 0
					let minDistance = Infinity

					that.scene.imagePlanes.forEach((imagePlane, i) => {
						const data = that.initialState.imagePlanesData[i]
						const rotationAmount = progress * Math.PI * 0.35
						const currentAngle = data.initialAngle + rotationAmount

						imagePlane.position.y = Math.sin(currentAngle) * data.radius
						imagePlane.position.z =
							Math.cos(currentAngle) * data.radius - data.radius
						imagePlane.rotation.x = -currentAngle

						const distanceFromCenter = Math.abs(imagePlane.position.y)
						if (distanceFromCenter < minDistance) {
							minDistance = distanceFromCenter
							mostVisibleIndex = i
						}
					})

					if (mostVisibleIndex !== previousMostVisibleIndex) {
						that.animateTextTransition(
							previousMostVisibleIndex,
							mostVisibleIndex
						)
						previousMostVisibleIndex = mostVisibleIndex
					}
				},
			}
		)

		// Rest of your existing animation code...
		this.projectsTl.fromTo(
			'[data-project-number]',
			{
				yPercent: 100 * (this.projectsTextContainer.length - 0.6),
			},
			{
				yPercent: -100 * (this.projectsTextContainer.length - 0.6),
				ease: 'none',
			},
			'<='
		)

		gsap.set('[data-project-type-container]', {
			width: document.querySelector('[data-project-type]').offsetWidth,
			height: document.querySelector('[data-project-type]').offsetHeight,
		})
	}

	animateTextTransition(previousIndex, currentIndex) {
		// Get the container and project type elements
		const container = document.querySelector('[data-project-type-container]')
		const projectTypes = document.querySelectorAll('[data-project-type]')

		// Get current project type width
		const currentProjectType = projectTypes[currentIndex]
		const targetWidth = currentProjectType ? currentProjectType.offsetWidth : 0
		const targetHeight = currentProjectType
			? currentProjectType.offsetHeight
			: 0

		// Animate container width
		gsap.to(container, {
			width: targetWidth,
			height: targetHeight,
			duration: 0.5,
			ease: 'power2.out',
		})

		// Hide previous project type
		if (previousIndex !== -1 && projectTypes[previousIndex]) {
			gsap.to(projectTypes[previousIndex], {
				opacity: 0,
				yPercent: -100,
				duration: 0.5,
				ease: 'power2.out',
			})
		}

		// Show current project type
		if (projectTypes[currentIndex]) {
			gsap.fromTo(
				projectTypes[currentIndex],
				{
					opacity: 0,
					yPercent: 100,
				},
				{
					opacity: 1,
					yPercent: 0,
					duration: 0.35,
					ease: 'power2.out',
				}
			)
		}

		this.projectsTextContainer.forEach((textEl, i) => {
			const numberContainer = document.querySelectorAll(
				'[data-project-number]'
			)[i]
			const linkEl = textEl.querySelector('[data-project-link]')

			gsap.set(textEl, {
				pointerEvents: i === currentIndex ? 'auto' : 'none',
			})

			if (i === previousIndex && previousIndex !== -1) {
				gsap.to(
					[
						this.splitTextHeading[previousIndex].lines,
						this.splitTextContent[previousIndex].lines,
						linkEl,
					],
					{
						duration: 0.5,
						ease: 'power2.out',
						yPercent: -100,
						stagger: 0.05,
						opacity: 0,
						rotate: 2.5,
					}
				)

				gsap.to(numberContainer, {
					opacity: 0.25,
					duration: 0.25,
				})
			}

			if (i === currentIndex) {
				gsap.fromTo(
					[
						this.splitTextHeading[currentIndex].lines,
						this.splitTextContent[currentIndex].lines,
						linkEl,
					],
					{
						yPercent: 100,
						opacity: 0,
						rotate: -2.5,
					},
					{
						duration: 0.5,
						ease: 'power2.out',
						yPercent: 0,
						opacity: 1,
						stagger: 0.05,
						delay: 0.1,
						rotate: 0,
					}
				)

				gsap.to(numberContainer, {
					opacity: 1,
					duration: 0.25,
				})
			}
		})
	}
}

export default ProjectsScrollTrigger
