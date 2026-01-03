/**
 * Run this script in browser console or as a one-time build step
 * to generate precomputed position data files.
 *
 * Usage: Call generateAllPositionData() in console, then save the downloaded files
 * to your static folder.
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const TEXTURE_SIZE = 256
const AMOUNT = TEXTURE_SIZE * TEXTURE_SIZE
const MODEL_SCALE = 100

function sampleMeshSurface(geometry, count, scale) {
	const posAttr = geometry.getAttribute('position')
	const indexAttr = geometry.getIndex()
	const positions = new Float32Array(count * 4)

	const triangles = []
	const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3

	for (let i = 0; i < triCount; i++) {
		const i3 = i * 3
		let a, b, c

		if (indexAttr) {
			a = indexAttr.getX(i3)
			b = indexAttr.getX(i3 + 1)
			c = indexAttr.getX(i3 + 2)
		} else {
			a = i3
			b = i3 + 1
			c = i3 + 2
		}

		const vA = new THREE.Vector3().fromBufferAttribute(posAttr, a)
		const vB = new THREE.Vector3().fromBufferAttribute(posAttr, b)
		const vC = new THREE.Vector3().fromBufferAttribute(posAttr, c)

		const edge1 = new THREE.Vector3().subVectors(vB, vA)
		const edge2 = new THREE.Vector3().subVectors(vC, vA)
		const area = new THREE.Vector3().crossVectors(edge1, edge2).length() * 0.5

		triangles.push({ vA, vB, vC, area })
	}

	let totalArea = 0
	const cumulativeAreas = triangles.map((t) => (totalArea += t.area))

	for (let i = 0; i < count; i++) {
		const i4 = i * 4

		const r = Math.random() * totalArea
		let triIndex = cumulativeAreas.findIndex((a) => a >= r)
		if (triIndex < 0) triIndex = triangles.length - 1

		const tri = triangles[triIndex]

		let u = Math.random()
		let v = Math.random()
		if (u + v > 1) {
			u = 1 - u
			v = 1 - v
		}
		const w = 1 - u - v

		positions[i4 + 0] = (tri.vA.x * w + tri.vB.x * u + tri.vC.x * v) * scale
		positions[i4 + 1] = (tri.vA.y * w + tri.vB.y * u + tri.vC.y * v) * scale
		positions[i4 + 2] = (tri.vA.z * w + tri.vB.z * u + tri.vC.z * v) * scale
		positions[i4 + 3] = Math.random()
	}

	return positions
}

function downloadBinary(data, filename) {
	const blob = new Blob([data], { type: 'application/octet-stream' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}

async function generatePositionData(glbPath, outputName) {
	const dracoLoader = new DRACOLoader()
	dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')

	const gltfLoader = new GLTFLoader()
	gltfLoader.setDRACOLoader(dracoLoader)

	const gltf = await gltfLoader.loadAsync(glbPath)

	let geometry = null
	gltf.scene.traverse((child) => {
		if (child.isMesh && !geometry) {
			geometry = child.geometry
		}
	})

	if (!geometry) {
		console.error(`No geometry found in ${glbPath}`)
		return
	}

	const positions = sampleMeshSurface(geometry, AMOUNT, MODEL_SCALE)
	downloadBinary(positions.buffer, `${outputName}.bin`)
	console.log(`Generated ${outputName}.bin`)
}

// Call this function in the browser console
window.generateAllPositionData = async function() {
	const models = [
		{ path: '/wp-content/themes/startdigital/static/three/brand.glb', name: 'brand-positions' },
		{ path: '/wp-content/themes/startdigital/static/three/campaign.glb', name: 'campaign-positions' },
		{ path: '/wp-content/themes/startdigital/static/three/design.glb', name: 'design-positions' },
		{ path: '/wp-content/themes/startdigital/static/three/digital.glb', name: 'digital-positions' },
	]

	for (const { path, name } of models) {
		await generatePositionData(path, name)
	}

	console.log('All position data generated! Move .bin files to static/three/')
}
