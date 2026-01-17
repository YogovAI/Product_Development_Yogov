/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#6366f1',
                secondary: '#ec4899',
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'gradient-warm': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'gradient-cool': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            },
        },
    },
    plugins: [],
}
