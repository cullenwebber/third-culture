export default function initAccordions() {
	const accordionHeaders = document.querySelectorAll('.accordion-header')

	if (!accordionHeaders) {
		return
	}

	accordionHeaders.forEach((header) => {
		const isActive = header.classList.contains('active')

		const accordionContent = header.nextElementSibling
		accordionContent.style.maxHeight = isActive
			? accordionContent.scrollHeight + 'px'
			: 0

		header.addEventListener('click', () => {
			header.classList.toggle('active')
			const accordionContent = header.nextElementSibling
			if (header.classList.contains('active')) {
				accordionContent.style.maxHeight = accordionContent.scrollHeight + 'px'
			} else {
				accordionContent.style.maxHeight = 0
			}
		})
	})
}
