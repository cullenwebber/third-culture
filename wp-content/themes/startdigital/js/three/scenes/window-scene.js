import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import BaseScene from '../base-scene'
import { getStaticPath } from '../utils'
import ConcreteShaderMaterial from '../materials/white-concrete'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { getLenis } from '../../utils/smooth-scroll'

class WindowScene extends BaseScene {
	constructor(id, container, options = {}) {
		super(id, container)

		// Configuration options
		this.targetDivSelector = '#home-about'
		this.columnModelPath = '/column.glb'
		this.ledgeThickness = 0.05
		this.ledgeDepth = 0.25
		this.zPosition = 0

		// Internal state
		this.targetDiv = null
		this.originalColumnDimensions = null
		this.scrollListener = null
		this.columns = null
		this.ledges = null
		this.lenis = getLenis()
	}

	adjustCamera() {
		this.camera.position.z = 1
	}

	setupScene() {
		this.targetDiv = document.querySelector(this.targetDivSelector)
	}

	createMaterials() {
		this.clippingPlanes = []
		this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
		this.clippingPlanes.push(this.clippingPlane)
		this.concreteMaterial = new ConcreteShaderMaterial()
		this.concreteMaterial.setClippingPlane(this.clippingPlanes)
	}

	async createObjects() {
		this.configureLoader()
		await this.loadColumns()
	}

	configureLoader() {
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
		)
		this.gltfLoader = new GLTFLoader()
		this.gltfLoader.setDRACOLoader(dracoLoader)
	}

	async loadColumns() {
		const glbPath = getStaticPath(this.columnModelPath)

		return new Promise((resolve, reject) => {
			this.gltfLoader.load(
				glbPath,
				(gltf) => {
					const box = new THREE.Box3().setFromObject(gltf.scene)
					const columnHeight = box.max.y - box.min.y
					const columnWidth = box.max.x - box.min.x

					// Store original column dimensions for scaling
					this.originalColumnDimensions = {
						height: columnHeight,
						width: columnWidth,
					}

					// Create left column
					const leftColumn = gltf.scene.clone()
					this.setupColumnMaterial(leftColumn)
					this.scene.add(leftColumn)

					// Create right column
					const rightColumn = gltf.scene.clone()
					this.setupColumnMaterial(rightColumn)
					this.scene.add(rightColumn)

					leftColumn.rotation.y = Math.PI / 2
					rightColumn.rotation.y = Math.PI / 2

					this.columns = [
						{ mesh: leftColumn, side: 'left' },
						{ mesh: rightColumn, side: 'right' },
					]

					// Initial positioning
					this.updateColumnPositions()
					resolve(gltf)
				},
				(progress) => {
					// Optional progress callback
					console.log(
						'Loading columns:',
						(progress.loaded / progress.total) * 100 + '%'
					)
				},
				(error) => {
					console.error('Error loading columns:', error)
					reject(error)
				}
			)
		})
	}

	setupColumnMaterial(columnMesh) {
		columnMesh.traverse((child) => {
			if (child.isMesh) {
				child.castShadow = true
				child.receiveShadow = true
				child.material = this.concreteMaterial.getMaterial()
			}
		})
	}

	createScrollTriggers() {
		this.scrollListener = () => {
			this.updateColumnPositions()
		}

		this.lenis.on('scroll', this.scrollListener.bind(this))
		window.addEventListener('resize', this.scrollListener.bind(this))
	}

	// Convert div's pixel coordinates to 3D world coordinates
	getDivWorldBounds() {
		if (!this.targetDiv) return null

		const rect = this.targetDiv.getBoundingClientRect()
		const containerRect = this.container.getBoundingClientRect()

		// Convert pixel coordinates to normalized coordinates (-1 to 1)
		const left =
			((rect.left - containerRect.left) / containerRect.width) * 2 - 1
		const right =
			((rect.right - containerRect.left) / containerRect.width) * 2 - 1
		const top = -(
			((rect.top - containerRect.top) / containerRect.height) * 2 -
			1
		)
		const bottom = -(
			((rect.bottom - containerRect.top) / containerRect.height) * 2 -
			1
		)

		// Convert to world coordinates
		const { width: frustumWidth, height: frustumHeight } =
			this.getFrustumDimensions()

		return {
			left: (left * frustumWidth) / 2,
			right: (right * frustumWidth) / 2,
			top: (top * frustumHeight) / 2,
			bottom: (bottom * frustumHeight) / 2,
			width: ((right - left) * frustumWidth) / 2,
			height: ((top - bottom) * frustumHeight) / 2,
			centerX: ((left + right) * frustumWidth) / 4,
			centerY: ((top + bottom) * frustumHeight) / 4,
		}
	}

	updateColumnPositions() {
		if (!this.columns || !this.targetDiv || !this.originalColumnDimensions)
			return

		const divBounds = this.getDivWorldBounds()
		if (!divBounds) return

		// Scale columns to match div height
		const scale = divBounds.height / this.originalColumnDimensions.height
		const scaledColumnWidth = this.originalColumnDimensions.width * scale

		this.columns.forEach(({ mesh, side }) => {
			mesh.scale.setScalar(scale)

			// Position columns at the edges of the div
			const xPos = side === 'left' ? divBounds.left : divBounds.right

			mesh.position.set(xPos, divBounds.centerY, this.zPosition)
		})

		// Update ledges to span between columns
		this.updateLedges(divBounds, scaledColumnWidth)
	}

	updateLedges(divBounds, scaledColumnWidth) {
		// Remove existing ledges
		if (this.ledges) {
			this.ledges.forEach((ledge) => {
				this.scene.remove(ledge)
				ledge.geometry.dispose()
			})
		}

		// Create new ledges with updated dimensions
		this.createLedgesWithBounds(divBounds, scaledColumnWidth)
	}

	createLedgesWithBounds(divBounds, scaledColumnWidth) {
		// Ledge dimensions based on div bounds
		const ledgeWidth = divBounds.width + scaledColumnWidth
		const ledgeHeight = this.ledgeThickness
		const ledgeDepth = this.ledgeDepth

		const ledgeGeometry = new RoundedBoxGeometry(
			ledgeWidth,
			ledgeHeight,
			ledgeDepth,
			5,
			ledgeHeight * 0.35
		)

		// Top ledge
		const topLedge = new THREE.Mesh(
			ledgeGeometry,
			this.concreteMaterial.getMaterial()
		)
		topLedge.position.set(
			divBounds.centerX,
			divBounds.top + ledgeHeight / 2,
			this.zPosition
		)
		topLedge.castShadow = true
		topLedge.receiveShadow = true
		this.scene.add(topLedge)

		// Bottom ledge
		const bottomLedge = new THREE.Mesh(
			ledgeGeometry,
			this.concreteMaterial.getMaterial()
		)
		bottomLedge.position.set(
			divBounds.centerX,
			divBounds.bottom - ledgeHeight / 2,
			this.zPosition
		)
		bottomLedge.castShadow = true
		bottomLedge.receiveShadow = true
		this.scene.add(bottomLedge)

		this.ledges = [topLedge, bottomLedge]
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect

		return { width, height }
	}

	onResize() {
		this.updateColumnPositions()
	}

	animate(deltaTime) {
		this.time += deltaTime
	}

	dispose() {
		// Remove scroll listeners
		if (this._throttledListener) {
			window.removeEventListener('scroll', this._throttledListener)
			window.removeEventListener('resize', this._throttledListener)
		}

		if (this.concreteMaterial && this.concreteMaterial.dispose) {
			this.concreteMaterial.dispose()
		}

		super.dispose()
	}
}

export default WindowScene
