/**
 * Draws an SVG stroke path from 0 to end
 */
export default function drawSVG(element, duration = 1) {
	const path = element.querySelector('[data-path]')
	const length = path.getTotalLength()

	// Clear any previous transition
	path.style.transition = path.style.WebkitTransition = 'none'

	// Set up the starting positions
	path.style.strokeDasharray = length + ' ' + length
	path.style.strokeDashoffset = length

	// Trigger a layout so styles are calculated & the browser
	// picks up the starting position before animating
	path.getBoundingClientRect()
	path.style.transition =
		path.style.WebkitTransition = `stroke-dashoffset ${duration}s cubic-bezier(.1,.5,.25,1)`

	// Go!
	path.style.strokeDashoffset = '0'
}
