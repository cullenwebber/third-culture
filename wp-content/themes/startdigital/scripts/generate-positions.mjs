import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { NodeIO } from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'

// Config
const TEXTURE_SIZE = 256
const AMOUNT = TEXTURE_SIZE * TEXTURE_SIZE
const MODEL_SCALE = 100

function sampleMeshSurface(positions, indices, amount, scale) {
	const output = new Float32Array(amount * 4)

	const triangles = []
	const triCount = indices ? indices.length / 3 : positions.length / 9

	for (let i = 0; i < triCount; i++) {
		let a, b, c
		if (indices) {
			a = indices[i * 3]
			b = indices[i * 3 + 1]
			c = indices[i * 3 + 2]
		} else {
			a = i * 3
			b = i * 3 + 1
			c = i * 3 + 2
		}

		const vA = { x: positions[a * 3], y: positions[a * 3 + 1], z: positions[a * 3 + 2] }
		const vB = { x: positions[b * 3], y: positions[b * 3 + 1], z: positions[b * 3 + 2] }
		const vC = { x: positions[c * 3], y: positions[c * 3 + 1], z: positions[c * 3 + 2] }

		const e1 = { x: vB.x - vA.x, y: vB.y - vA.y, z: vB.z - vA.z }
		const e2 = { x: vC.x - vA.x, y: vC.y - vA.y, z: vC.z - vA.z }
		const cross = {
			x: e1.y * e2.z - e1.z * e2.y,
			y: e1.z * e2.x - e1.x * e2.z,
			z: e1.x * e2.y - e1.y * e2.x,
		}
		const area = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z) * 0.5

		if (area > 0) {
			triangles.push({ vA, vB, vC, area })
		}
	}

	if (triangles.length === 0) {
		throw new Error('No valid triangles found')
	}

	let totalArea = 0
	const cumulativeAreas = triangles.map((t) => (totalArea += t.area))

	for (let i = 0; i < amount; i++) {
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

		output[i4 + 0] = (tri.vA.x * w + tri.vB.x * u + tri.vC.x * v) * scale
		output[i4 + 1] = (tri.vA.y * w + tri.vB.y * u + tri.vC.y * v) * scale
		output[i4 + 2] = (tri.vA.z * w + tri.vB.z * u + tri.vC.z * v) * scale
		output[i4 + 3] = Math.random()
	}

	return output
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const staticDir = join(__dirname, '../static/three')

const models = [
	{ input: 'brand.glb', output: 'brand-positions.bin' },
	{ input: 'campaign.glb', output: 'campaign-positions.bin' },
	{ input: 'design.glb', output: 'design-positions.bin' },
	{ input: 'digital.glb', output: 'digital-positions.bin' },
]

async function main() {
	console.log('Generating position data...\n')

	// Initialize IO with Draco support
	const io = new NodeIO()
		.registerExtensions(KHRONOS_EXTENSIONS)
		.registerDependencies({
			'draco3d.decoder': await draco3d.createDecoderModule(),
		})

	for (const { input, output } of models) {
		try {
			const glbPath = join(staticDir, input)
			const document = await io.read(glbPath)

			// Get first mesh
			const mesh = document.getRoot().listMeshes()[0]
			if (!mesh) throw new Error('No mesh found')

			const primitive = mesh.listPrimitives()[0]
			if (!primitive) throw new Error('No primitive found')

			const positionAccessor = primitive.getAttribute('POSITION')
			if (!positionAccessor) throw new Error('No POSITION attribute')

			const positions = positionAccessor.getArray()
			const indicesAccessor = primitive.getIndices()
			const indices = indicesAccessor ? indicesAccessor.getArray() : null

			console.log(`  ${input}: ${positions.length / 3} vertices, ${indices ? indices.length / 3 : 'no'} triangles`)

			const sampledPositions = sampleMeshSurface(positions, indices, AMOUNT, MODEL_SCALE)

			const outputPath = join(staticDir, output)
			writeFileSync(outputPath, Buffer.from(sampledPositions.buffer))

			console.log(`  ✓ → ${output} (${(sampledPositions.buffer.byteLength / 1024).toFixed(0)} KB)\n`)
		} catch (error) {
			console.error(`  ✗ ${input}: ${error.message}\n`)
		}
	}

	console.log('Done!')
}

main()
