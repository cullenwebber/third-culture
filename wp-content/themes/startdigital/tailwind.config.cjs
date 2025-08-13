module.exports = {
	content: ['./*/*.php', './*.php', './templates/**/*.twig', './*/*/.js'],
	theme: {
		extend: {
			aspectRatio: {
				'16/9': '16/9',
				'3/2': '3/2',
				'4/3': '4/3',
				'3/4': '3/4',
				'1/1': '1/1',
			},
			colors: {
				white: '#FFFFFF',
				black: '#000000',
				// brand:
				// brandLight:
				// brandDark:
			},
			fontFamily: {
				heading: ['Roboto', 'sans-serif'],
				body: ['Inter', 'sans-serif'],
			},
			screens: {
				sm: '640px',
				md: '768px',
				lg: '1024px',
				xl: '1280px',
				'2xl': '1435px',
				'3xl': '1690px',
				'4xl': '2000px',
			},
		},
	},
	plugins: [require('@tailwindcss/typography')],
}
