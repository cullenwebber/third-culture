import Swiper from 'swiper/bundle'

let swiperInstance = null

function initNewsSwiper() {
	const swiperContainer = document.querySelector('#news-swiper-container')
	if (!swiperContainer) return

	const nextBtn = document.querySelector('#news-swiper-next')
	const prevBtn = document.querySelector('#news-swiper-prev')

	swiperInstance = new Swiper(swiperContainer, {
		slidesPerView: 1,
		spaceBetween: 16,
		breakpoints: {
			640: {
				slidesPerView: 1.5,
			},
			// 768: {},
			1024: { slidesPerView: 2.5 },
			1280: { slidesPerView: 3 },
			// 1435: {},
			1690: {
				slidesPerView: 3,
			},
			1921: {
				slidesPerView: 4,
			},
		},
		navigation: {
			nextEl: nextBtn,
			prevEl: prevBtn,
		},
	})
}

export function destroyNewsSwiper() {
	if (swiperInstance) {
		swiperInstance.destroy(true, true)
		swiperInstance = null
	}
}

export default initNewsSwiper
