import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import BaseScene from '../base-scene.js'
import WhiteBackgroundMaterial from '../materials/white-background-material.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoundedTriangleGeometry } from '../utils/RoundedTriangleGeometry.js'
import WebGLManager from '../context-manager.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

class ContactScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.cameraDistance = 5

		// Physics
		this.world = null
		this.physicsObjects = []

		// Mouse tracking
		this.mouse = new THREE.Vector2(9999, 9999)
		this.prevMouse = new THREE.Vector2(9999, 9999)
		this.mouse3d = new THREE.Vector3()
		this.isMouseMoving = false

		// Mobile auto-spawn
		this.isMobile = false
		this.autoSpawnAngle = 0
		this.autoSpawnRadius = 0.5
		this.autoSpawnCenter = new THREE.Vector2(0, 0)
		this.autoSpawnNoiseOffset = Math.random() * 1000

		// Shape config
		this.shapeSize = 0.5
		this.maxShapes = 150
	}

	setupScene() {
		this.setupPhysics()

		// Environment map for reflections
		this.context = new WebGLManager()
		const environment = new RoomEnvironment()
		const pmremGenerator = new THREE.PMREMGenerator(this.context.renderer)
		this.envMap = pmremGenerator.fromScene(environment).texture
		this.scene.environment = this.envMap

		// Detect mobile
		this.isMobile =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent
			) || window.innerWidth < 768
	}

	setupPhysics() {
		this.world = new CANNON.World()
		this.world.gravity.set(0, -1, 0) // Gravity pulling down
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
		const isMobile = window.innerWidth < 640
		this.camera.position.z = isMobile
			? this.cameraDistance + 1
			: this.cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	createMaterials() {
		this.whiteMaterial = new WhiteBackgroundMaterial()

		// Fill material with reflections
		this.fillMaterial = new THREE.MeshStandardMaterial({
			color: '#f7f7f7',
			roughness: 0.1,
			metalness: 0.9,
			flatShading: false,
		})

		// Outline material (backface)
		this.outlineMaterial = new THREE.MeshBasicMaterial({
			color: '#030030',
			side: THREE.BackSide,
			flatShading: false,
		})
	}

	createObjects() {
		this.createBackground()
		this.createGeometries()
	}

	createBackground() {
		const { width, height } = this.getFrustumDimensions(0)
		const planeGeometry = new THREE.PlaneGeometry(width, height, 1, 1)
		this.background = new THREE.Mesh(planeGeometry, this.whiteMaterial)
		this.background.renderOrder = -1
		this.scene.add(this.background)
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

	createLights() {
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
		this.scene.add(ambientLight)

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
		directionalLight.position.set(5, 5, 5)
		this.scene.add(directionalLight)
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
				this.updateMouse3d()
				this.isMouseMoving = true
			} else {
				this.mouse.x = 9999
				this.mouse.y = 9999
			}
		}

		this.onTouchMove = (event) => {
			if (event.touches.length > 0) {
				const touch = event.touches[0]
				const rect = this.container.getBoundingClientRect()
				if (
					touch.clientX >= rect.left &&
					touch.clientX <= rect.right &&
					touch.clientY >= rect.top &&
					touch.clientY <= rect.bottom
				) {
					this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1
					this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1
					this.updateMouse3d()
					this.isMouseMoving = true
				} else {
					this.mouse.x = 9999
					this.mouse.y = 9999
				}
			}
		}

		this.onTouchEnd = () => {
			this.mouse.x = 9999
			this.mouse.y = 9999
		}

		window.addEventListener('mousemove', this.onMouseMove)
		window.addEventListener('touchstart', this.onTouchMove, { passive: true })
		window.addEventListener('touchmove', this.onTouchMove, { passive: true })
		window.addEventListener('touchend', this.onTouchEnd)
	}

	updateMouse3d() {
		if (this.mouse.x === 9999) return

		const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
		vector.unproject(this.camera)

		const dir = vector.sub(this.camera.position).normalize()
		const distance = -this.camera.position.z / dir.z
		this.mouse3d.copy(this.camera.position).add(dir.multiplyScalar(distance))
	}

	updateAutoSpawn(deltaTime) {
		// Swirl parameters
		const speed = 1.5
		const radiusVariation = 0.3
		const centerDrift = 0.2

		// Update angle
		this.autoSpawnAngle += deltaTime * speed

		// Organic radius variation using sin waves
		const noise1 = Math.sin(this.time * 0.7 + this.autoSpawnNoiseOffset)
		const noise2 = Math.sin(this.time * 1.3 + this.autoSpawnNoiseOffset * 2)
		const currentRadius = this.autoSpawnRadius + noise1 * radiusVariation

		// Drift the center slowly
		this.autoSpawnCenter.x = Math.sin(this.time * 0.3) * centerDrift
		this.autoSpawnCenter.y = Math.cos(this.time * 0.2) * centerDrift

		// Calculate swirl position in normalized coords (-1 to 1)
		const swirlX =
			this.autoSpawnCenter.x + Math.cos(this.autoSpawnAngle) * currentRadius
		const swirlY =
			this.autoSpawnCenter.y +
			Math.sin(this.autoSpawnAngle + noise2 * 0.5) * currentRadius

		// Convert to 3D position
		const vector = new THREE.Vector3(swirlX, swirlY, 0.5)
		vector.unproject(this.camera)

		const dir = vector.sub(this.camera.position).normalize()
		const distance = -this.camera.position.z / dir.z
		this.mouse3d.copy(this.camera.position).add(dir.multiplyScalar(distance))

		// Spawn shape
		this.spawnShape()
	}

	spawnShape() {
		// Skip if no valid position (desktop with no mouse movement)
		if (!this.isMobile && this.mouse.x === 9999) return

		// Remove oldest shape if at max
		if (this.physicsObjects.length >= this.maxShapes) {
			const oldest = this.physicsObjects.shift()
			this.scene.remove(oldest.group)
			this.world.removeBody(oldest.body)
		}

		// Randomly choose cube or triangle
		const isTriangle = Math.random() > 0.5
		const geometry = isTriangle ? this.triangleGeometry : this.cubeGeometry

		// Group for fill + outline
		const group = new THREE.Group()

		// Outline mesh (behind, scaled up)
		const outlineMesh = new THREE.Mesh(geometry, this.outlineMaterial)
		outlineMesh.scale.setScalar(1.04)
		group.add(outlineMesh)

		// Fill mesh
		const fillMesh = new THREE.Mesh(geometry, this.fillMaterial)
		group.add(fillMesh)

		group.position.copy(this.mouse3d)
		group.position.z = (Math.random() - 0.5) * 0.5
		this.scene.add(group)

		// Physics body
		let physicsShape
		if (isTriangle) {
			const triangleRadius = (this.shapeSize * Math.sqrt(3)) / 3
			physicsShape = new CANNON.Cylinder(
				triangleRadius * 0.7,
				triangleRadius * 0.7,
				this.shapeSize * 0.25,
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
		body.position.set(this.mouse3d.x, this.mouse3d.y, group.position.z)

		// Random initial rotation
		body.quaternion.setFromEuler(
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2
		)

		// Add slight random velocity for variety
		body.velocity.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0)

		body.angularVelocity.set(
			(Math.random() - 0.5) * 5,
			(Math.random() - 0.5) * 5,
			(Math.random() - 0.5) * 5
		)

		this.world.addBody(body)
		this.physicsObjects.push({ group, body, isTriangle })
	}

	animate(deltaTime) {
		if (!this.isInitialized) return
		this.time += deltaTime

		// Spawn shapes only when mouse is moving
		if (this.isMouseMoving) {
			this.spawnShape()
			this.isMouseMoving = false
		}

		// Auto-spawn swirl on mobile
		if (this.isMobile && this.isVisible) {
			this.updateAutoSpawn(deltaTime)
		}

		// Step physics
		const fixedDelta = 1 / 60
		this.world.step(fixedDelta, deltaTime, 3)

		// Get frustum bounds for cleanup
		const { height } = this.getFrustumDimensions(0)
		const bottomY = -height / 2 - 2

		// Sync groups to bodies and remove fallen shapes
		for (let i = this.physicsObjects.length - 1; i >= 0; i--) {
			const obj = this.physicsObjects[i]
			obj.group.position.copy(obj.body.position)
			obj.group.quaternion.copy(obj.body.quaternion)

			// Remove if fallen below view
			if (obj.body.position.y < bottomY) {
				this.scene.remove(obj.group)
				this.world.removeBody(obj.body)
				this.physicsObjects.splice(i, 1)
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
	}

	dispose() {
		// Remove event listeners
		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
			window.removeEventListener('touchstart', this.onTouchMove)
			window.removeEventListener('touchmove', this.onTouchMove)
			window.removeEventListener('touchend', this.onTouchEnd)
		}

		// Clear physics objects
		this.physicsObjects.forEach((obj) => {
			this.world.removeBody(obj.body)
		})

		// Dispose geometries and materials
		if (this.cubeGeometry) this.cubeGeometry.dispose()
		if (this.triangleGeometry) this.triangleGeometry.dispose()
		if (this.fillMaterial) this.fillMaterial.dispose()
		if (this.outlineMaterial) this.outlineMaterial.dispose()

		super.dispose()
	}
}

export default ContactScene
