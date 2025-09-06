/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        'uber-black': '#000000',
        'uber-dark': '#0D0D0D',
        'uber-gray-900': '#1A1A1A',
        'uber-gray-800': '#2D2D2D',
        'uber-gray-700': '#404040',
        'uber-gray-600': '#525252',
        'uber-gray-500': '#737373',
        'uber-gray-400': '#A3A3A3',
        'uber-gray-300': '#D4D4D4',
        'uber-gray-200': '#E5E5E5',
        'uber-gray-100': '#F5F5F5',
        'uber-green': '#00B341',
        'uber-blue': '#0066FF',
        'uber-purple': '#8B5CF6',
        'uber-yellow': '#FFE135',
        'uber-red': '#FF4444',
      },
      backgroundImage: {
        'gradient-uber': 'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 100%)',
        'gradient-card': 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 179, 65, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 179, 65, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}