/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
  	extend: {
  		colors: {
  			surface: {
  				'0': '#080808',
  				'1': '#0d0d0d',
  				'2': '#141414',
  				'3': '#1a1a1a',
  				'4': '#222222'
  			},
  			border: {
  				subtle: '#161616',
  				default: '#2a2a2a',
  				strong: '#3a3a3a'
  			},
  			text: {
  				primary: '#f0f0f2',
  				secondary: '#8e8e99',
  				muted: '#55555f',
  				disabled: '#3a3a42'
  			},
  			accent: {
  				blue: '#4c6ef5',
  				green: '#20c97e',
  				orange: '#f5a623',
  				red: '#e5484d',
  				purple: '#9b6dff'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Inter',
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'Fira Code',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'2xs': [
  				'10px',
  				{
  					lineHeight: '14px'
  				}
  			],
  			xs: [
  				'11px',
  				{
  					lineHeight: '16px'
  				}
  			],
  			sm: [
  				'12px',
  				{
  					lineHeight: '18px'
  				}
  			],
  			base: [
  				'13px',
  				{
  					lineHeight: '20px'
  				}
  			],
  			lg: [
  				'14px',
  				{
  					lineHeight: '20px'
  				}
  			],
  			xl: [
  				'16px',
  				{
  					lineHeight: '24px'
  				}
  			],
  			'2xl': [
  				'20px',
  				{
  					lineHeight: '28px'
  				}
  			],
  			'3xl': [
  				'24px',
  				{
  					lineHeight: '32px'
  				}
  			]
  		},
  		boxShadow: {
  			subtle: '0 1px 2px rgba(0,0,0,0.4)',
  			card: '0 2px 8px rgba(0,0,0,0.5)',
  			modal: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
  			dropdown: '0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)'
  		},
  		borderRadius: {
  			sm: 'var(--radius-sm)',
  			md: 'var(--radius-md)',
  			lg: 'var(--radius-lg)',
  			xl: 'var(--radius-xl)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [],
}
