// USING EMBLA CAROUSEL
// DOCS: https://www.embla-carousel.com/get-started/module

import EmblaCarousel from 'embla-carousel'
import AutoScroll from 'embla-carousel-auto-scroll'
import { addPrevNextBtnsClickHandlers } from './arrowButtons'
import { addDotBtnsAndClickHandlers } from './dotButtons'

export default function initSliders() {
	initDefaultSliders()
	initInfiniteScroll()

	// DEFAULT SLIDER

	function initDefaultSliders() {
		const emblaSlider = document.querySelector('.embla__slider')

		if (!emblaSlider) {
			return
		}

		const viewportNode = emblaSlider.querySelector('.embla__viewport')

		const options = {
			loop: true,
		}

		const prevBtnNode = emblaSlider.querySelector('.embla__button--prev')
		const nextBtnNode = emblaSlider.querySelector('.embla__button--next')
		const dotsNode = emblaSlider.querySelector('.embla__dots')

		const emblaApi = EmblaCarousel(viewportNode, options)

		const removePrevNextBtnsClickHandlers = addPrevNextBtnsClickHandlers(
			emblaApi,
			prevBtnNode,
			nextBtnNode
		)
		const removeDotBtnsAndClickHandlers = addDotBtnsAndClickHandlers(
			emblaApi,
			dotsNode
		)

		emblaApi.on('destroy', removePrevNextBtnsClickHandlers)
		emblaApi.on('destroy', removeDotBtnsAndClickHandlers)
	}

	// INFINITE SCROLL SLIDER

	function initInfiniteScroll() {
		const emblaInfinite = document.querySelector('.embla__infinite')

		if (!emblaInfinite) {
			return
		}

		const viewportNode = emblaInfinite.querySelector('.embla__viewport')

		const options = {
			loop: true,
			skipSnaps: true,
			dragFree: true,
		}

		EmblaCarousel(viewportNode, options, [
			AutoScroll({
				stopOnInteraction: false,
				speed: 2,
			}),
		])
	}
}
