import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import BaseScene from '../base-scene.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoundedTriangleGeometry } from '../utils/RoundedTriangleGeometry.js'
import WebGLManager from '../context-manager.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import GradientMaterial from '../materials/gradient-material.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

class FooterScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		// Physics
		this.world = null
		this.physicsObjects = []
		this.mouseBody = null

		// Mouse tracking
		this.mouse = new THREE.Vector2(9999, 9999)
		this.mouse3d = new THREE.Vector3()
		this.prevMouse3d = new THREE.Vector3()
		this.mouseVelocity = new THREE.Vector3()

		// Scroll tracking
		this.attractionActive = false
		this.attractionProgress = 0 // 0 to 1, how much attraction is applied

		// Config
		this.cubeCount = 18
		this.cameraDistance = 5
	}

	setupScrollTrigger() {
		const { height } = this.getFrustumDimensions()

		ScrollTrigger.create({
			trigger: this.container,
			start: 'top bottom',
			end: 'top top',
			onUpdate: (self) => {
				this.attractionProgress = self.progress

				// Activate attraction when past 50%
				if (self.progress > 0.5 && !this.attractionActive) {
					this.attractionActive = true
				}

				if (this.physicsContainer) {
					this.physicsContainer.position.y = height * (1 - self.progress)
				}
			},
			onLeaveBack: () => {
				this.attractionProgress = 0
				this.attractionActive = false
			},
		})
	}

	setupScene() {
		this.setupPhysics()

		// Create container for physics objects to follow screen center
		this.physicsContainer = new THREE.Group()
		this.scene.add(this.physicsContainer)

		this.context = new WebGLManager()
		const environment = new RoomEnvironment()
		const pmremGenerator = new THREE.PMREMGenerator(this.context.renderer)
		this.envMap = pmremGenerator.fromScene(environment).texture
		this.scene.environment = this.envMap
	}

	adjustCamera() {
		this.camera.position.z = this.cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	createLights() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 10.0)
		this.scene.add(ambientLight)
	}

	setupPhysics() {
		this.world = new CANNON.World()
		this.world.gravity.set(0, 0, 0)
		this.world.broadphase = new CANNON.SAPBroadphase(this.world)
		this.world.solver.iterations = 10

		// Materials
		this.defaultMaterial = new CANNON.Material('default')
		this.mouseMaterial = new CANNON.Material('mouse')

		// Object-to-object contact
		const objectContact = new CANNON.ContactMaterial(
			this.defaultMaterial,
			this.defaultMaterial,
			{ friction: 0.1, restitution: 0.1 }
		)
		this.world.addContactMaterial(objectContact)

		// Mouse sphere (kinematic - we control its position)
		this.mouseBody = new CANNON.Body({
			mass: 0,
			type: CANNON.Body.KINEMATIC,
			material: this.mouseMaterial,
		})
		this.mouseBody.addShape(new CANNON.Sphere(1.0))
		this.mouseBody.position.set(0, 100, 0) // Start off-screen
		this.world.addBody(this.mouseBody)
	}

	createObjects() {
		const shapeSize = 0.8
		const shapeCount = 25
		for (let i = 0; i < shapeCount; i++) {
			// Randomly choose between cube and triangle
			const shapeType = Math.random() > 0.5 ? 'cube' : 'triangle'
			this.createShape(shapeSize, i, shapeType)
		}

		this.createBackground()
		this.setupScrollTrigger()
	}

	createBackground() {
		const { width: canvasWidth, height: canvasHeight } =
			this.container.getBoundingClientRect()
		this.gradientMaterial = new GradientMaterial()
		this.gradientMaterial.uniforms.resolution.value.set(
			canvasWidth,
			canvasHeight
		)
		this.gradientMaterial.uniforms.progress.value = 0.5

		const { width, height } = this.getFrustumDimensions(0)
		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.gradientMaterial)
		this.background.renderOrder = -1 // Render first, behind everything
		this.scene.add(this.background)
	}

	createShape(size, index, shapeType) {
		// Create geometry based on shape type
		let geometry
		let physicsShape

		if (shapeType === 'triangle') {
			// Rounded right-angled triangular prism
			geometry = new RoundedTriangleGeometry(size, size * 0.9, size * 0.075, 3)

			// Use cylinder approximation for physics
			const triangleRadius = (size * Math.sqrt(3)) / 3
			physicsShape = new CANNON.Cylinder(
				triangleRadius,
				triangleRadius,
				size,
				6
			)
		} else {
			// Rounded cube
			geometry = new RoundedBoxGeometry(size, size, size, 4, size * 0.075)

			// Box shape for physics
			const halfSize = size / 2
			physicsShape = new CANNON.Box(
				new CANNON.Vec3(halfSize, halfSize, halfSize)
			)
		}

		const color = '#030030'
		const material = new THREE.MeshStandardMaterial({
			color,
			roughness: 0.3,
			metalness: 0.8,
		})

		const mesh = new THREE.Mesh(geometry, material)

		// Random starting position in a sphere
		const theta = Math.random() * Math.PI * 2
		const phi = Math.acos(2 * Math.random() - 1)
		const radius = 1.5 + Math.random() * 1.5

		const x = radius * Math.sin(phi) * Math.cos(theta)
		const y = radius * Math.sin(phi) * Math.sin(theta)
		const z = (Math.random() - 0.5) * 1.5

		mesh.position.set(x, y, z)
		this.physicsContainer.add(mesh)

		// Cannon.js body
		const body = new CANNON.Body({
			mass: 0.5,
			material: this.defaultMaterial,
			linearDamping: 0.9,
			angularDamping: 0.9,
		})

		body.addShape(physicsShape)
		body.position.set(x, y, z)

		// Random initial rotation
		body.quaternion.setFromEuler(
			Math.random() * Math.PI,
			Math.random() * Math.PI,
			Math.random() * Math.PI
		)

		this.world.addBody(body)

		this.physicsObjects.push({ mesh, body, size, shapeType })
	}

	createMouseListeners() {
		this.onMouseMove = (event) => {
			const rect = this.container.getBoundingClientRect()

			if (
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom
			) {
				this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
				this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
			} else {
				this.mouse.x = 9999
				this.mouse.y = 9999
			}
		}

		window.addEventListener('mousemove', this.onMouseMove)
	}

	updateMouse3d() {
		if (this.mouse.x === 9999) {
			this.mouseBody.position.set(0, 100, 0)
			return
		}

		// Store previous position
		this.prevMouse3d.copy(this.mouse3d)

		// Project mouse to z=0 plane
		const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
		vector.unproject(this.camera)

		const dir = vector.sub(this.camera.position).normalize()
		const distance = -this.camera.position.z / dir.z
		this.mouse3d.copy(this.camera.position).add(dir.multiplyScalar(distance))

		// Update mouse body position
		this.mouseBody.position.set(this.mouse3d.x, this.mouse3d.y, this.mouse3d.z)

		// Calculate velocity
		this.mouseVelocity.subVectors(this.mouse3d, this.prevMouse3d)
	}

	applyForces(deltaTime) {
		const mouseRepulsionRadius = 4.0
		const mouseRepulsionStrength = 25.0

		const mouseSpeed = this.mouseVelocity.length() / deltaTime
		const velocityBoost = Math.min(mouseSpeed * 0.3, 5.0)

		for (const obj of this.physicsObjects) {
			const pos = obj.body.position

			// Attraction to center (controlled by attractionProgress)
			if (this.attractionProgress > 0) {
				const toCenterX = -pos.x
				const toCenterY = -pos.y
				const toCenterZ = -pos.z
				const distToCenter = Math.sqrt(
					toCenterX * toCenterX + toCenterY * toCenterY + toCenterZ * toCenterZ
				)

				if (distToCenter > 0.1) {
					// Base attraction strength
					let centerStrength = 1.5

					// When attraction becomes active, apply a strong initial burst
					if (this.attractionActive && this.attractionProgress > 0.5) {
						centerStrength = 8.0 // Much stronger when triggered
					}

					// Scale by progress
					const attractionForce =
						centerStrength *
						Math.min(distToCenter, 3.0) *
						this.attractionProgress
					const centerForce = new CANNON.Vec3(
						(toCenterX / distToCenter) * attractionForce,
						(toCenterY / distToCenter) * attractionForce,
						(toCenterZ / distToCenter) * attractionForce
					)
					obj.body.applyForce(centerForce)
				}
			}

			// Mouse repulsion
			if (this.mouse.x !== 9999) {
				const mousePos = this.mouseBody.position
				const dx = pos.x - mousePos.x
				const dy = pos.y - mousePos.y
				const dz = pos.z - mousePos.z
				const distToMouse = Math.sqrt(dx * dx + dy * dy + dz * dz)

				const effectiveRadius = mouseRepulsionRadius + velocityBoost * 0.5

				if (distToMouse < effectiveRadius && distToMouse > 0.1) {
					const falloff = 1 - distToMouse / effectiveRadius
					const repulsion =
						mouseRepulsionStrength * falloff * falloff * (1 + velocityBoost)

					// Add mouse velocity direction to push objects in movement direction
					const pushX = dx / distToMouse + this.mouseVelocity.x * 2
					const pushY = dy / distToMouse + this.mouseVelocity.y * 2
					const pushZ = dz / distToMouse + this.mouseVelocity.z * 2
					const pushLen = Math.sqrt(
						pushX * pushX + pushY * pushY + pushZ * pushZ
					)

					if (pushLen > 0.01) {
						const force = new CANNON.Vec3(
							(pushX / pushLen) * repulsion,
							(pushY / pushLen) * repulsion,
							(pushZ / pushLen) * repulsion
						)
						obj.body.applyForce(force)

						// Add some spin when hit
						const torque = new CANNON.Vec3(
							(Math.random() - 0.5) * repulsion * 0.3,
							(Math.random() - 0.5) * repulsion * 0.3,
							(Math.random() - 0.5) * repulsion * 0.3
						)
						obj.body.applyTorque(torque)
					}
				}
			}

			// Keep objects roughly in view with soft boundaries
			const boundaryRadius = 4.0
			const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y)
			if (dist > boundaryRadius) {
				const pushBack = (dist - boundaryRadius) * 1.0
				const force = new CANNON.Vec3(
					(-pos.x / dist) * pushBack,
					(-pos.y / dist) * pushBack,
					0
				)
				obj.body.applyForce(force)
			}

			// Keep z roughly centered
			if (Math.abs(pos.z) > 1.5) {
				obj.body.applyForce(new CANNON.Vec3(0, 0, -pos.z * 2))
			}
		}
	}

	updatePhysics(deltaTime) {
		this.applyForces(deltaTime)

		// Step physics (fixed timestep for stability)
		const fixedDelta = 1 / 60
		this.world.step(fixedDelta, deltaTime, 3)

		// Sync meshes to bodies
		for (const obj of this.physicsObjects) {
			obj.mesh.position.copy(obj.body.position)
			obj.mesh.quaternion.copy(obj.body.quaternion)

			// Clamp velocity
			const vel = obj.body.velocity
			const speed = vel.length()
			if (speed > 15) {
				vel.scale(15 / speed, vel)
			}
		}
	}

	animate(deltaTime) {
		if (!this.isInitialized || this.physicsObjects.length === 0) return

		if (this.gradientMaterial) {
			this.gradientMaterial.uniforms.time.value += deltaTime
		}

		this.time += deltaTime

		this.updateMouse3d()
		this.updatePhysics(deltaTime)
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}

	dispose() {
		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
		}

		// Kill ScrollTriggers for this scene
		ScrollTrigger.getAll().forEach((st) => {
			if (st.trigger === this.container) {
				st.kill()
			}
		})

		// Clear physics
		this.physicsObjects.forEach((obj) => {
			this.world.removeBody(obj.body)
		})

		if (this.mouseBody) {
			this.world.removeBody(this.mouseBody)
		}

		super.dispose()
	}
}

export default FooterScene
