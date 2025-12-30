/**
 * Detect device performance capability for graphics optimization
 * Returns 'low', 'medium', or 'high'
 */
export function getDeviceCapability() {
	// Check device memory (in GB) - Safari doesn't support this
	const memory = navigator.deviceMemory || 4

	// Check CPU cores
	const cores = navigator.hardwareConcurrency || 4

	// Check for mobile/touch device
	const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
	const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches

	// Check GPU via WebGL
	const canvas = document.createElement('canvas')
	const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
	let gpuTier = 'unknown'

	if (gl) {
		const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
		if (debugInfo) {
			const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()

			// Low-end mobile GPUs
			if (
				renderer.includes('mali-4') ||
				renderer.includes('mali-t') ||
				renderer.includes('adreno 3') ||
				renderer.includes('adreno 4') ||
				renderer.includes('powervr') ||
				renderer.includes('intel hd graphics 4') ||
				renderer.includes('intel hd graphics 5')
			) {
				gpuTier = 'low'
			}
			// Mid-range GPUs
			else if (
				renderer.includes('mali-g') ||
				renderer.includes('adreno 5') ||
				renderer.includes('adreno 6') ||
				renderer.includes('intel iris') ||
				renderer.includes('intel uhd')
			) {
				gpuTier = 'medium'
			}
			// High-end GPUs
			else if (
				renderer.includes('nvidia') ||
				renderer.includes('radeon') ||
				renderer.includes('adreno 7') ||
				renderer.includes('apple gpu') ||
				renderer.includes('apple m')
			) {
				gpuTier = 'high'
			}
		}
	}

	// Score-based approach
	let score = 0

	// Memory scoring
	if (memory >= 8) score += 3
	else if (memory >= 4) score += 2
	else score += 1

	// CPU scoring
	if (cores >= 8) score += 3
	else if (cores >= 4) score += 2
	else score += 1

	// GPU scoring
	if (gpuTier === 'high') score += 3
	else if (gpuTier === 'medium') score += 2
	else if (gpuTier === 'low') score += 1
	else score += 2 // Unknown, assume medium

	// Touch devices often have less GPU power for complex shaders
	if (isTouchDevice && isCoarsePointer) score -= 1

	// Determine capability level
	if (score <= 4) return 'low'
	if (score <= 7) return 'medium'
	return 'high'
}

/**
 * Simple check if device is likely low-powered
 * All touch devices are considered low-powered for graphics
 */
export function isLowPowerDevice() {
	if (isTouchDevice()) return true
	return getDeviceCapability() === 'low'
}

/**
 * Check if device is a touch device
 */
export function isTouchDevice() {
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
