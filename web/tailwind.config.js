/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#00236f',
        'primary-container': '#1e3a8a',
        'primary-fixed': '#dce1ff',
        'primary-fixed-dim': '#b6c4ff',
        'on-primary': '#ffffff',
        'on-primary-container': '#90a8ff',
        'on-primary-fixed': '#00164e',
        
        'secondary': '#904d00',
        'secondary-container': '#fe932c',
        'secondary-fixed': '#ffdcc3',
        'secondary-fixed-dim': '#ffb77d',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#663500',
        
        'tertiary': '#00312c',
        'tertiary-container': '#004942',
        'tertiary-fixed': '#89f5e7',
        'tertiary-fixed-dim': '#6bd8cb',
        'on-tertiary': '#ffffff',
        'on-tertiary-fixed': '#00201d',
        
        'surface': '#f8f9ff',
        'surface-dim': '#cbdbf5',
        'surface-bright': '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff4ff',
        'surface-container': '#e5eeff',
        'surface-container-high': '#dce9ff',
        'surface-container-highest': '#d3e4fe',
        
        'on-surface': '#0b1c30',
        'on-surface-variant': '#444651',
        'outline': '#757682',
        'outline-variant': '#c5c5d3',
        
        'background': '#f8f9ff',
        'on-background': '#0b1c30',
        
        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        headline: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
};
