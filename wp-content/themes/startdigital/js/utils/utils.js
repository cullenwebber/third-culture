/**
 * Converts text-indent CSS property to an inline span element
 * @param {HTMLElement} element - The element to process
 * @param {HTMLElement} [styleSource] - Element to read indent from (defaults to element.parentElement)
 */
export function convertIndentToSpan(
	element,
	styleSource = element.parentElement
) {
	if (!element || !styleSource) return

	const indent = window.getComputedStyle(styleSource).textIndent
	element.style.textIndent = '0'

	if (indent && indent !== '0px') {
		const indentSpan = document.createElement('span')
		indentSpan.style.display = 'inline-block'
		indentSpan.style.width = indent
		element.insertBefore(indentSpan, element.firstChild)
	}
}
