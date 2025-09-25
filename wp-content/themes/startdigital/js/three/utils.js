import * as THREE from 'three'

export function createCanvas() {
	const canvas = document.createElement('canvas')

	canvas.style.position = 'fixed'
	canvas.style.left = 0
	canvas.style.top = 0
	canvas.style.zIndex = 35

	document.body.appendChild(canvas)

	return canvas
}

export function getStaticPath(url) {
	return '/wp-content/themes/startdigital/static/three' + url
}

export function RoundedPlane(width, height, radius, smoothness = 8) {
	const shape = new THREE.Shape()

	const x = -width / 2
	const y = -height / 2
	const r = Math.min(radius, Math.min(width, height) / 2)

	shape.moveTo(x, y + r)
	shape.lineTo(x, y + height - r)
	shape.quadraticCurveTo(x, y + height, x + r, y + height)
	shape.lineTo(x + width - r, y + height)
	shape.quadraticCurveTo(x + width, y + height, x + width, y + height - r)
	shape.lineTo(x + width, y + r)
	shape.quadraticCurveTo(x + width, y, x + width - r, y)
	shape.lineTo(x + r, y)
	shape.quadraticCurveTo(x, y, x, y + r)

	const geometry = new THREE.ShapeGeometry(shape, smoothness)
	return geometry
}
