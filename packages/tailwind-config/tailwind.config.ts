import type { Config } from "tailwindcss"    
import theme from '../design-system/dist/tailwind/theme'

const config: Omit<Config, "content"> = {
  theme: {
    extend: { 
      colors: theme.colors,
      borderRadius: theme.borderRadius,
      spacing: theme.spacing,
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
    },
  },
}

export default config