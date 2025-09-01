import Swiper from 'swiper'

function initNewsSwiper() {
	const swiperContainer = document.querySelector('#news-swiper-container')

	if (!swiperContainer) return

	const swiper = new Swiper(swiperContainer, {
		slidesPerView: 1,
		spaceBetween: 16,
		breakpoints: {
			640: {
				slidesPerView: 1.5,
			},
			// 768: {},
			1024: { slidesPerView: 2.5 },
			1280: { slidesPerView: 3.25 },
			// 1435: {},
			// 1690: {},
		},
	})
}

export default initNewsSwiper
