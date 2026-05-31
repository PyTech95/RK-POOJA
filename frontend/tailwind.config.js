/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        extend: {
            fontFamily: {
                heading: ['Outfit', 'system-ui', 'sans-serif'],
                body: ['Manrope', 'system-ui', 'sans-serif'],
                sans: ['Manrope', 'system-ui', 'sans-serif'],
            },
            colors: {
                rk: {
                    navy:   '#0A2E6D',
                    'navy-700': '#0B3A89',
                    'navy-900': '#061d4a',
                    orange: '#FF7A00',
                    'orange-600': '#E66E00',
                    'orange-50':  '#FFF1E0',
                    bg:     '#F8FAFC',
                    surface:'#FFFFFF',
                    ink:    '#0F172A',
                    muted:  '#475569',
                    border: '#E2E8F0',
                    hot:    '#FF7A00',
                    warm:   '#F59E0B',
                    cold:   '#3B82F6',
                },
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))', '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))', '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
                'pulse-ring': {
                    '0%': { transform: 'scale(0.9)', opacity: '0.7' },
                    '70%': { transform: 'scale(1.3)', opacity: '0' },
                    '100%': { transform: 'scale(1.3)', opacity: '0' },
                },
                'float': {
                    '0%,100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            backgroundImage: {
                'rk-radial': 'radial-gradient(circle at 20% 0%, rgba(255,122,0,0.15), transparent 50%), radial-gradient(circle at 80% 100%, rgba(10,46,109,0.12), transparent 50%)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
