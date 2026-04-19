/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0A0C10',
        'surface-1': '#111318',
        'surface-2': '#181C24',
        'border-subtle': '#1E2330',
        'border-active': '#2E3650',
        'accent': '#4F6EF7',
        'accent-muted': 'rgba(79,110,247,0.12)',
        'text-primary': '#E8ECF4',
        'text-secondary': '#8B95B0',
        'text-muted': '#4B5570',
        'success': '#22C55E',
        'danger': '#EF4444',
        'warning': '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
