import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import BaseScene from '../base-scene'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getStaticPath } from '../utils'
import HomePhysicsTrigger from '../animate/home-physics-trigger'
import StoneMaterial from '../materials/stone'
import BackgroundShaderMaterial from '../materials/background-material'

class LogoPhysicsScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.world = new CANNON.World()
		this.physicsObjects = []
		this.mouse = new THREE.Vector2()
		this.raycaster = new THREE.Raycaster()
		this.mouseBody = null
		this.cameraDistance = 3
	}

	setupScene() {
		this.scene.background = new THREE.Color(0x1e1e1e)
		this.setupPhysics()
		this.setupMouseEvents()
	}

	adjustCamera() {
		this.camera.position.z = this.cameraDistance
		this.camera.position.y = -4
	}

	createLights() {
		this.spotLight = new THREE.SpotLight(0xffffff, 5.0)
		this.spotLight.position.set(0.0, 0.0, 3.0)
		this.scene.add(this.spotLight)

		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
		this.scene.add(this.ambientLight)
	}

	setupPhysics() {
		this.world.gravity.set(0, 0, 0)
		this.world.broadphase = new CANNON.NaiveBroadphase()
		this.world.solver.iterations = 10
		this.mouseBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC })
		this.mouseBody.addShape(new CANNON.Sphere(0.25))
		this.mouseBody.position.set(0, 10, 0)
		this.world.addBody(this.mouseBody)
	}

	setupMouseEvents() {
		this.handleMouseMove = this.handleMouseMove.bind(this)
		window.addEventListener('mousemove', this.handleMouseMove)
	}

	handleMouseMove(event) {
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
		this.mouse.y = (-event.clientY / window.innerHeight) * 2 + 1

		this.raycaster.setFromCamera(this.mouse, this.camera)
		const distance = this.cameraDistance
		const worldPos = new THREE.Vector3()
		worldPos.copy(this.raycaster.ray.direction)
		worldPos.multiplyScalar(distance)
		worldPos.add(this.raycaster.ray.origin)

		this.mouseBody.position.set(worldPos.x, worldPos.y, worldPos.z)
	}

	createMaterials() {
		this.material = new StoneMaterial()
		this.backgroundMaterial = new BackgroundShaderMaterial()

		this.defaultMaterial = new CANNON.Material('default')
		this.mouseRepelMaterial = new CANNON.Material('mouseRepel')
		this.wallMaterial = new CANNON.Material('wall')

		// Contact material for mouse repulsion
		const mouseContact = new CANNON.ContactMaterial(
			this.defaultMaterial,
			this.mouseRepelMaterial,
			{
				friction: 0.0,
				restitution: 0.1,
			}
		)
		this.world.addContactMaterial(mouseContact)

		// Contact material for object-to-object collisions
		const objectContact = new CANNON.ContactMaterial(
			this.defaultMaterial,
			this.defaultMaterial,
			{
				friction: 0.1,
				restitution: 0.8, // Bouncy collisions between objects
			}
		)
		this.world.addContactMaterial(objectContact)

		// Contact material for wall collisions
		const wallContact = new CANNON.ContactMaterial(
			this.defaultMaterial,
			this.wallMaterial,
			{
				friction: 0.2,
				restitution: 0.6, // Objects bounce off walls
			}
		)
		this.world.addContactMaterial(wallContact)
	}

	createObjects() {
		this.createBackgroundPlane()
		this.createPhysicsWalls()
		this.loadIcons()
	}

	createPhysicsWalls() {
		const { width, height } = this.getFrustumDimensions(-1)
		const wallThickness = 0.1

		// Back wall (where the background plane is)
		const backWall = new CANNON.Body({
			mass: 0, // Static body
			material: this.wallMaterial,
			type: CANNON.Body.KINEMATIC,
		})
		backWall.addShape(
			new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, wallThickness / 2))
		)
		backWall.position.set(0, 0, -1 - wallThickness / 2) // Just behind the background plane
		this.world.addBody(backWall)

		// Store wall references if you need to update them on resize
		this.physicsWalls = {
			back: backWall,
		}
	}

	loadIcons() {
		const glbPath = getStaticPath('/cube-and-triangle.glb')
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

				let index = 0
				this.logo.traverse((child) => {
					if (!child.isMesh) return

					child.castShadow = true
					child.material = this.material.getMaterial()

					// Create physics body
					const body = new CANNON.Body({
						mass: 0.75,
						material: this.defaultMaterial,
					})

					let x

					if (index == 0) {
						x = 2
					} else {
						x = -2
					}

					body.position.set(x, 0, 0)
					child.position.set(x, 0, 0)

					// Simple box shape for both cube and triangle
					body.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)))

					this.world.addBody(body)

					this.physicsObjects.push({
						mesh: child,
						body: body,
					})

					index++
				})

				// This is only here because it requires the logo to be loaded in first
				this.animationTriggers = new HomePhysicsTrigger(this)
				this.mouseBody.material = this.mouseRepelMaterial
				this.scene.add(this.logo)
			},
			undefined,
			undefined
		)
	}

	applyGravitationalForces() {
		const centerPoint = new CANNON.Vec3(0, 0, 0) // Center of the scene
		const centerStrength = 14.0 // Strength of attraction to center
		const repulsionStrength = 0.2 // Gentle repulsion between objects when too close
		const minDistance = 0.5 // Minimum distance for repulsion

		for (let i = 0; i < this.physicsObjects.length; i++) {
			const obj = this.physicsObjects[i]
			const pos = obj.body.position

			// Calculate attraction force toward center
			const toCenterX = centerPoint.x - pos.x
			const toCenterY = centerPoint.y - pos.y
			const toCenterZ = centerPoint.z - pos.z
			const distanceToCenter = Math.sqrt(
				toCenterX * toCenterX + toCenterY * toCenterY + toCenterZ * toCenterZ
			)

			if (distanceToCenter > 0.1) {
				// Avoid division by zero
				// Apply center attraction force
				const forceMultiplier = centerStrength / distanceToCenter
				const centerForce = new CANNON.Vec3(
					toCenterX * forceMultiplier,
					toCenterY * forceMultiplier,
					toCenterZ * forceMultiplier
				)
				obj.body.applyForce(centerForce)
			}

			// Apply gentle repulsion between objects to prevent clustering
			for (let j = i + 1; j < this.physicsObjects.length; j++) {
				const obj2 = this.physicsObjects[j]
				const pos2 = obj2.body.position

				const dx = pos.x - pos2.x
				const dy = pos.y - pos2.y
				const dz = pos.z - pos2.z
				const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

				if (distance < minDistance && distance > 0.1) {
					// Apply repulsion force when objects are too close
					const repulsionForce =
						repulsionStrength * (1 - distance / minDistance)
					const force1 = new CANNON.Vec3(
						(dx / distance) * repulsionForce,
						(dy / distance) * repulsionForce,
						(dz / distance) * repulsionForce
					)
					const force2 = new CANNON.Vec3(
						(-dx / distance) * repulsionForce,
						(-dy / distance) * repulsionForce,
						(-dz / distance) * repulsionForce
					)

					obj.body.applyForce(force1)
					obj2.body.applyForce(force2)
				}
			}
		}

		// Apply repulsion from mouse
		if (this.mouseBody) {
			const mousePos = this.mouseBody.position
			const mouseRepulsionRadius = 3.0
			const mouseRepulsionStrength = 5.0

			for (let i = 0; i < this.physicsObjects.length; i++) {
				const obj = this.physicsObjects[i]
				const pos = obj.body.position

				const dx = pos.x - mousePos.x
				const dy = pos.y - mousePos.y
				const dz = pos.z - mousePos.z
				const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

				if (distance < mouseRepulsionRadius && distance > 0.1) {
					const repulsionForce =
						mouseRepulsionStrength * (1 - distance / mouseRepulsionRadius)
					const force = new CANNON.Vec3(
						(dx / distance) * repulsionForce,
						(dy / distance) * repulsionForce,
						(dz / distance) * repulsionForce
					)
					obj.body.applyForce(force)
				}
			}
		}
	}

	updatePhysics(deltaTime) {
		// Apply gravitational forces before physics step
		this.applyGravitationalForces()

		// Step physics simulation
		this.world.step(Math.min(deltaTime, 1 / 120))

		// Sync Three.js meshes with Cannon.js bodies
		this.physicsObjects.forEach((obj) => {
			obj.mesh.position.copy(obj.body.position)
			obj.mesh.quaternion.copy(obj.body.quaternion)

			// Apply damping to prevent objects from flying away
			obj.body.velocity.scale(0.98, obj.body.velocity)
			obj.body.angularVelocity.scale(0.95, obj.body.angularVelocity)

			// Add a maximum velocity to prevent explosions
			const maxVelocity = 10
			const vel = obj.body.velocity
			const speed = vel.length()
			if (speed > maxVelocity) {
				vel.scale(maxVelocity / speed, vel)
			}
		})
	}

	createBackgroundPlane() {
		const { width, height } = this.getFrustumDimensions(-1)
		const plane = new THREE.PlaneGeometry(width, height, 1, 1)
		const mesh = new THREE.Mesh(plane, this.backgroundMaterial.getMaterial())
		mesh.receiveShadow = true
		mesh.position.z = -1

		this.backgroundPlane = mesh
		this.scene.add(mesh)
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect

		return { width, height }
	}

	animate(deltaTime) {
		super.animate(deltaTime)
		this.time += deltaTime
		if (this.physicsObjects.length > 0) {
			this.updatePhysics(deltaTime)
		}
		this.backgroundMaterial.updateTime(this.time)
	}

	// Clean up on destroy
	destroy() {
		window.removeEventListener('mousemove', this.handleMouseMove)
		super.destroy()
	}
}

export default LogoPhysicsScene
