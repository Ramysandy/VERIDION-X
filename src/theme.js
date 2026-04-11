import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  fonts: {
    heading: `'Bricolage Grotesque', sans-serif`,
    body: `'Outfit', sans-serif`,
  },
  colors: {
    brand: {
      // Light-mode tokens (kept for backward compat)
      light: '#EAEFEF',
      lighter: '#BFC9D1',
      dark: '#25343F',
      accent: '#FF6B2B',
      // Dark-mode surface tokens
      bg: '#07101F',
      surface: '#0D1829',
      surfaceAlt: '#141f33',
      border: 'rgba(255, 107, 43, 0.2)',
      borderMuted: 'rgba(255, 255, 255, 0.06)',
      glow: 'rgba(255, 107, 43, 0.4)',
      textMuted: 'rgba(255,255,255,0.55)',
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
      '*': {
        boxSizing: 'border-box',
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
          fontWeight: 700,
          letterSpacing: '0.02em',
          _hover: { bg: '#FF8533', transform: 'translateY(-1px)', boxShadow: '0 8px 24px rgba(255,107,43,0.4)' },
          _active: { transform: 'translateY(0)' },
          transition: 'all 0.2s ease',
        },
        ghost: {
          _hover: { bg: 'rgba(255,107,43,0.08)', color: 'brand.accent' },
        },
        outline: {
          borderColor: 'brand.accent',
          color: 'brand.accent',
          _hover: { bg: 'rgba(255,107,43,0.08)', transform: 'translateY(-1px)' },
          transition: 'all 0.2s ease',
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(37, 52, 63, 0.08)',
          transition: 'box-shadow 0.3s ease',
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderRadius: '10px',
            _focusVisible: {
              borderColor: 'brand.accent',
              boxShadow: '0 0 0 1px #FF6B2B, 0 0 20px rgba(255,107,43,0.2)',
            },
          },
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: '6px',
        fontWeight: 700,
        letterSpacing: '0.05em',
      },
    },
  },
})

export default theme