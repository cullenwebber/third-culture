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
