/**
 * Make a callback only run every X milliseconds
 *
 * @param {function} callback
 * @param {int} wait milliseconds
 * @returns void
 */
export default function debounce(callback, wait) {
	let timeoutId = null
	return (...args) => {
		window.clearTimeout(timeoutId)
		timeoutId = window.setTimeout(() => {
			callback.apply(null, args)
		}, wait)
	}
}
