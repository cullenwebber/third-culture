import * as THREE from 'three'
import { Text as ThreeText } from 'three-text/three'
import { Text as TroikaText } from 'troika-three-text'
import { isLowPowerDevice } from '../../utils/device-capability'

// Set HarfBuzz path for three-text (only used on high-power devices)
if (!isLowPowerDevice()) {
	ThreeText.setHarfBuzzPath('/wp-content/themes/startdigital/static/hb/hb.wasm')
}

const useTroika = isLowPowerDevice()

/**
 * Creates text mesh - uses troika-three-text on low-power devices for performance,
 * three-text on high-power devices for quality 3D geometry
 */
export async function createText(options) {
	const {
		text,
		font,
		size,
		letterSpacing = 0,
		depth = 0.001,
		embolden = 0,
		lineHeight = 1.2,
		layout = {},
		material = null,
	} = options

	if (useTroika) {
		return createTroikaText(options)
	} else {
		return createThreeText(options)
	}
}

async function createTroikaText(options) {
	const {
		text,
		font,
		size,
		letterSpacing = 0,
		lineHeight = 1.2,
		layout = {},
		color = 0x000000,
	} = options

	return new Promise((resolve) => {
		const textMesh = new TroikaText()

		textMesh.text = text
		textMesh.font = font
		textMesh.fontSize = size
		textMesh.letterSpacing = letterSpacing * size // troika uses absolute units
		textMesh.lineHeight = lineHeight
		textMesh.maxWidth = layout.width || Infinity
		textMesh.textAlign = layout.align || 'left'
		textMesh.anchorX =
			layout.align === 'center'
				? 'center'
				: layout.align === 'right'
				? 'right'
				: 'left'
		textMesh.anchorY = 'middle'
		textMesh.color = color // Troika uses its own color property, not material

		textMesh.sync(() => {
			// Create a wrapper object similar to three-text result
			resolve({
				mesh: textMesh,
				geometry: textMesh.geometry,
				isTroika: true,
			})
		})
	})
}

async function createThreeText(options) {
	const {
		text,
		font,
		size,
		letterSpacing = 0,
		depth = 0.001,
		embolden = 0,
		lineHeight = 1.2,
		layout = {},
		curveFidelity = {
			distanceTolerance: 6.0,
			angleTolerance: 1.0,
		},
		geometryOptimization = {
			enabled: true,
		},
	} = options

	const result = await ThreeText.create({
		text,
		font,
		size,
		letterSpacing,
		depth,
		embolden,
		lineHeight,
		layout,
		curveFidelity,
		geometryOptimization,
	})

	return {
		mesh: null, // three-text returns geometry, not mesh
		geometry: result.geometry,
		isTroika: false,
	}
}

/**
 * Helper to create a mesh from text result with proper material handling
 */
export function createTextMesh(textResult, material) {
	if (textResult.isTroika) {
		const textMesh = textResult.mesh
		if (material) {
			textMesh.material = material
		}
		return textMesh
	} else {
		return new THREE.Mesh(textResult.geometry, material)
	}
}

/**
 * Check if we're using troika (for conditional logic if needed)
 */
export function isUsingTroika() {
	return useTroika
}
