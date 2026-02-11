/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#E57373", // Soft Red (was warm terracotta #d97757)
                secondary: "#e0e0e0", // Soft white text
                background: "#211f1f", // Warm dark charcoal
                surface: "#2f2d2d", // Slightly lighter warm dark
                subtle: "#8e8b8b", // Muted text
            },
            fontFamily: {
                serif: ['"EB Garamond"', 'serif'],
                sans: ['"Inter"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
