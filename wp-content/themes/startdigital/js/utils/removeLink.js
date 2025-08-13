// REMOVE DEFAULT ACTION AND LINK FROM PARENT NAVIGATION ITEMS
// .no-link CLASS TO MENU ITEMS IN WP MENUS

export default function initRemoveLinks() {
	const noLinks = document.querySelectorAll('.no-link > a')

	if (!noLinks) {
		return
	}

	noLinks.forEach((link) => {
		link.removeAttribute('href')

		link.addEventListener('click', (e) => {
			e.preventDefault()
		})
	})
}
