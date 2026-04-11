import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  fonts: {
    heading: `'Bricolage Grotesque', sans-serif`,
    body: `'Outfit', sans-serif`,
  },
  colors: {
    brand: {
      light: '#EAEFEF',
      lighter: '#BFC9D1',
      dark: '#25343F',
      accent: '#FF9B51',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'brand.light',
        color: 'brand.dark',
        fontFamily: 'body',
      },
      '*::placeholder': {
        color: 'brand.lighter',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'orange',
      },
      variants: {
        solid: {
          bg: 'brand.accent',
          color: 'white',
          _hover: { bg: '#ff8a2f' },
          _focus: { boxShadow: '0 0 0 3px rgba(255, 155, 81, 0.2)' },
        },
      },
    },
    Card: {
      baseStyle: {
        bg: 'white',
        borderRadius: 'lg',
        boxShadow: '0 2px 8px rgba(37, 52, 63, 0.08)',
      },
    },
  },
})

export default theme