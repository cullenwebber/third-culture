import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import BaseScene from '../base-scene.js'
import GradientMaterial from '../materials/gradient-material.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoundedTriangleGeometry } from '../utils/RoundedTriangleGeometry.js'
import WebGLManager from '../context-manager.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class AboutScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.cameraDistance = 5

		// Physics
		this.world = null
		this.physicsObjects = []

		// Shape config
		this.shapeSize = 1.75
	}

	setupScene() {
		this.time = 0
		this.setupPhysics()

		// Environment map for reflections
		this.context = new WebGLManager()
		const environment = new RoomEnvironment()
		const pmremGenerator = new THREE.PMREMGenerator(this.context.renderer)
		this.envMap = pmremGenerator.fromScene(environment).texture
		this.scene.environment = this.envMap
	}

	setupPhysics() {
		this.world = new CANNON.World()
		this.world.gravity.set(0, -7, 0) // Gravity pulling down
		this.world.broadphase = new CANNON.SAPBroadphase(this.world)
		this.world.solver.iterations = 10

		// Default material
		this.defaultMaterial = new CANNON.Material('default')
		const contactMaterial = new CANNON.ContactMaterial(
			this.defaultMaterial,
			this.defaultMaterial,
			{ friction: 0.3, restitution: 0.3 }
		)
		this.world.addContactMaterial(contactMaterial)
	}

	adjustCamera() {
		this.camera.position.z = this.cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	createMaterials() {
		const { width, height } = this.container.getBoundingClientRect()
		this.gradientMaterial = new GradientMaterial()
		this.gradientMaterial.uniforms.resolution.value.set(width, height)

		// Fill material with reflections
		this.fillMaterial = new THREE.MeshStandardMaterial({
			color: '#030030',
			roughness: 0.3,
			metalness: 0.8,
			flatShading: false,
		})

		// Outline material (backface)
		this.outlineMaterial = new THREE.MeshBasicMaterial({
			color: '#ffffff',
			side: THREE.BackSide,
			flatShading: false,
		})
	}

	createLights() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
		this.scene.add(ambientLight)

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
		directionalLight.position.set(5, 5, 5)
		this.scene.add(directionalLight)
	}

	async createObjects() {
		const { width, height } = this.getFrustumDimensions(0)
		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.gradientMaterial)
		this.background.renderOrder = -1
		this.scene.add(this.background)

		this.createGeometries()
		this.throwShapes()
	}

	createGeometries() {
		// Pre-create geometries for reuse
		this.cubeGeometry = new RoundedBoxGeometry(
			this.shapeSize,
			this.shapeSize * 0.25,
			this.shapeSize,
			4,
			this.shapeSize * 0.075
		)

		this.triangleGeometry = new RoundedTriangleGeometry(
			this.shapeSize,
			this.shapeSize * 0.25,
			this.shapeSize * 0.075,
			3
		)
	}

	throwShapes() {
		const { height } = this.getFrustumDimensions(0)
		const bottomY = -height / 2 - 1

		// Create square
		this.createShape(false, -0.75, bottomY)

		// Create triangle
		this.createShape(true, 0.75, bottomY)
	}

	createShape(isTriangle, xOffset, startY) {
		const geometry = isTriangle ? this.triangleGeometry : this.cubeGeometry

		// Group for fill + outline
		const group = new THREE.Group()

		// Fill mesh
		const fillMesh = new THREE.Mesh(geometry, this.fillMaterial)
		group.add(fillMesh)

		group.position.set(xOffset, startY, 0)
		this.scene.add(group)

		// Physics body
		let physicsShape
		if (isTriangle) {
			const triangleRadius = (this.shapeSize * Math.sqrt(3)) / 3
			physicsShape = new CANNON.Cylinder(
				triangleRadius,
				triangleRadius,
				this.shapeSize,
				6
			)
		} else {
			const halfSize = this.shapeSize / 2
			physicsShape = new CANNON.Box(
				new CANNON.Vec3(halfSize, halfSize * 0.25, halfSize)
			)
		}

		const body = new CANNON.Body({
			mass: 1,
			material: this.defaultMaterial,
			linearDamping: 0.1,
			angularDamping: 0.3,
		})

		body.addShape(physicsShape)
		body.position.set(xOffset, startY, 0)

		// Random initial rotation
		body.quaternion.setFromEuler(
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2
		)

		// Throw upward with slight horizontal variation
		const throwForce = 6 + Math.random() * 2
		body.velocity.set((Math.random() - 0.5) * 2, throwForce, 0)

		body.angularVelocity.set(
			(Math.random() - 0.5) * 5,
			(Math.random() - 0.5) * 5,
			(Math.random() - 0.5) * 5
		)

		this.world.addBody(body)
		this.physicsObjects.push({ group, body, isTriangle })
	}

	createScrollTriggers() {
		ScrollTrigger.create({
			trigger: this.container,
			start: 'top bottom',
			end: 'bottom top',
			scrub: true,
			onUpdate: (self) => {
				if (this.gradientMaterial) {
					this.gradientMaterial.uniforms.progress.value = self.progress
				}
			},
		})
	}

	animate(deltaTime) {
		if (!this.isInitialized) return

		this.time += deltaTime

		if (this.gradientMaterial) {
			this.gradientMaterial.uniforms.time.value += deltaTime
		}

		// Step physics
		if (this.world) {
			const fixedDelta = 1 / 60
			this.world.step(fixedDelta, deltaTime, 3)
		}

		// Get frustum bounds for respawn check
		const { height } = this.getFrustumDimensions(0)
		const bottomY = -height / 2 - 1

		// Sync meshes to bodies and check for respawn
		for (let i = this.physicsObjects.length - 1; i >= 0; i--) {
			const obj = this.physicsObjects[i]
			obj.group.position.copy(obj.body.position)
			obj.group.quaternion.copy(obj.body.quaternion)

			// Re-throw if fallen below view
			if (obj.body.position.y < bottomY) {
				// Reset position
				const xOffset = obj.isTriangle ? 0.75 : -0.75
				obj.body.position.set(xOffset, bottomY, 0)

				// New random rotation
				obj.body.quaternion.setFromEuler(
					Math.random() * Math.PI * 2,
					Math.random() * Math.PI * 2,
					Math.random() * Math.PI * 2
				)

				// Throw upward again
				const throwForce = 9 + Math.random() * 4
				obj.body.velocity.set((Math.random() - 0.5) * 2, throwForce, 0)

				obj.body.angularVelocity.set(
					(Math.random() - 0.5) * 5,
					(Math.random() - 0.5) * 5,
					(Math.random() - 0.5) * 5
				)
			}
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

	onResize(width, height) {
		super.onResize(width, height)
		this.adjustCamera()

		const { width: cw, height: ch } = this.container.getBoundingClientRect()

		if (this.gradientMaterial) {
			this.gradientMaterial.uniforms.resolution.value.set(cw, ch)
		}

		if (this.background) {
			const { width: fw, height: fh } = this.getFrustumDimensions(0)
			this.background.geometry.dispose()
			this.background.geometry = new THREE.PlaneGeometry(fw, fh, 1, 1)
		}
	}

	dispose() {
		ScrollTrigger.getAll().forEach((st) => {
			if (st.trigger === this.container) st.kill()
		})
		if (this.gradientMaterial) this.gradientMaterial.dispose()
		super.dispose()
	}
}

export default AboutScene
