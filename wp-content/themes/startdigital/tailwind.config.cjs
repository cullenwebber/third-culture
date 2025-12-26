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
				white: '#F7F7F7',
				black: '#232323',
				darkBlue: '#030030',
				navy: '#02001B',
				overlay: '#1A1835',
				lightBlue: '#B3AFED',
				paragraphLight: '#AAA9B7',
				paragraphDark: '#51506A',
			},
			fontFamily: {
				heading: ['Montreal', 'sans-serif'],
				body: ['Montreal', 'sans-serif'],
				supertitle: ['Montreal', 'sans-serif'],
			},
			borderRadius: {
				4: '4px',
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
