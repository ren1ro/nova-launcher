import type { Theme } from './types'

const SANS = "'Segoe UI', system-ui, -apple-system, sans-serif"
const MONO = "Consolas, 'Cascadia Mono', 'Courier New', monospace"
const SERIF = "Georgia, 'Times New Roman', serif"
const TREB = "'Trebuchet MS', 'Segoe UI', sans-serif"

type P = Partial<Theme> & Pick<Theme, 'id' | 'name' | 'mode' | 'colors'>

function t(p: P): Theme {
	return {
		author: 'Nova',
		fonts: { body: SANS, heading: SANS, mono: MONO },
		shape: { radius: 14, buttonStyle: 'solid', cardStyle: 'glass' },
		effects: { speed: 220, hover: 'lift', blur: 14, glow: 0.35, grain: 0 },
		background: { image: 'none', blur: 0, dim: 0 },
		builtin: true,
		...p,
	} as Theme
}

export const BUILTIN_THEMES: Theme[] = [
	t({
		id: 'midnight-neon',
		name: 'Midnight Neon',
		mode: 'dark',
		colors: {
			bg: '#0a0a14', bg2: '#10101f', surface: 'rgba(28,28,52,.62)', surface2: 'rgba(44,44,80,.7)',
			border: 'rgba(124,92,255,.22)', text: '#ecebff', textDim: '#9a98c4',
			accent: '#7c5cff', accent2: '#22d3ee', accentText: '#ffffff', danger: '#ff5c7a', success: '#3ddc97',
		},
		background: {
			image: 'radial-gradient(900px 500px at 12% -10%, rgba(124,92,255,.35), transparent 60%), radial-gradient(800px 500px at 100% 110%, rgba(34,211,238,.25), transparent 60%)',
			blur: 0, dim: 0,
		},
		effects: { speed: 220, hover: 'glow', blur: 16, glow: 0.7, grain: 0.05 },
	}),
	t({
		id: 'aurora',
		name: 'Aurora',
		mode: 'dark',
		colors: {
			bg: '#06141a', bg2: '#0a1d25', surface: 'rgba(14,44,54,.6)', surface2: 'rgba(22,66,78,.68)',
			border: 'rgba(80,255,200,.18)', text: '#e6fff8', textDim: '#86b9ad',
			accent: '#2ee6a6', accent2: '#7c8cff', accentText: '#03231a', danger: '#ff6b7f', success: '#2ee6a6',
		},
		background: {
			image: 'radial-gradient(1000px 520px at 80% -10%, rgba(46,230,166,.28), transparent 60%), radial-gradient(900px 520px at 0% 100%, rgba(124,140,255,.25), transparent 60%)',
			blur: 0, dim: 0,
		},
		shape: { radius: 18, buttonStyle: 'pill', cardStyle: 'glass' },
		effects: { speed: 260, hover: 'glow', blur: 18, glow: 0.55, grain: 0 },
	}),
	t({
		id: 'sakura',
		name: 'Sakura',
		mode: 'light',
		colors: {
			bg: '#fff1f5', bg2: '#ffe4ec', surface: 'rgba(255,255,255,.75)', surface2: 'rgba(255,238,244,.95)',
			border: 'rgba(214,80,130,.22)', text: '#3a1626', textDim: '#9a5c74',
			accent: '#ec4c86', accent2: '#ff9ab8', accentText: '#ffffff', danger: '#d62b4b', success: '#1f9d6a',
		},
		background: {
			image: 'radial-gradient(800px 460px at 90% -10%, rgba(255,154,184,.5), transparent 60%), radial-gradient(700px 460px at 0% 110%, rgba(236,76,134,.18), transparent 60%)',
			blur: 0, dim: 0,
		},
		fonts: { body: TREB, heading: SERIF, mono: MONO },
		shape: { radius: 22, buttonStyle: 'pill', cardStyle: 'raised' },
		effects: { speed: 240, hover: 'lift', blur: 12, glow: 0.2, grain: 0 },
	}),
	t({
		id: 'nord-frost',
		name: 'Nord Frost',
		mode: 'dark',
		colors: {
			bg: '#2e3440', bg2: '#292e39', surface: '#3b4252', surface2: '#434c5e',
			border: '#4c566a', text: '#eceff4', textDim: '#a9b4c8',
			accent: '#88c0d0', accent2: '#81a1c1', accentText: '#1f2530', danger: '#bf616a', success: '#a3be8c',
		},
		shape: { radius: 8, buttonStyle: 'solid', cardStyle: 'outlined' },
		effects: { speed: 160, hover: 'lift', blur: 0, glow: 0, grain: 0 },
	}),
	t({
		id: 'dracula',
		name: 'Dracula',
		mode: 'dark',
		colors: {
			bg: '#1e1f29', bg2: '#191a23', surface: '#282a36', surface2: '#343746',
			border: '#44475a', text: '#f8f8f2', textDim: '#9aa0c0',
			accent: '#bd93f9', accent2: '#ff79c6', accentText: '#1e1f29', danger: '#ff5555', success: '#50fa7b',
		},
		fonts: { body: SANS, heading: SANS, mono: MONO },
		shape: { radius: 10, buttonStyle: 'soft', cardStyle: 'flat' },
		effects: { speed: 180, hover: 'glow', blur: 0, glow: 0.4, grain: 0 },
	}),
	t({
		id: 'solar-light',
		name: 'Solar Light',
		mode: 'light',
		colors: {
			bg: '#fdf6e3', bg2: '#f5ecd1', surface: '#fffaf0', surface2: '#eee8d5',
			border: '#d9d0b4', text: '#2b3a40', textDim: '#6e7f84',
			accent: '#268bd2', accent2: '#2aa198', accentText: '#ffffff', danger: '#dc322f', success: '#859900',
		},
		fonts: { body: SANS, heading: SERIF, mono: MONO },
		shape: { radius: 12, buttonStyle: 'solid', cardStyle: 'raised' },
		effects: { speed: 200, hover: 'lift', blur: 0, glow: 0, grain: 0 },
	}),
	t({
		id: 'paper',
		name: 'Paper',
		mode: 'light',
		colors: {
			bg: '#f4f4f1', bg2: '#ebebe6', surface: '#ffffff', surface2: '#f0f0ec',
			border: '#dcdcd4', text: '#1b1b1b', textDim: '#6b6b66',
			accent: '#111111', accent2: '#ff5a1f', accentText: '#ffffff', danger: '#d92d20', success: '#12805c',
		},
		fonts: { body: SANS, heading: SERIF, mono: MONO },
		shape: { radius: 4, buttonStyle: 'sharp', cardStyle: 'outlined' },
		effects: { speed: 140, hover: 'none', blur: 0, glow: 0, grain: 0 },
	}),
	t({
		id: 'forest',
		name: 'Forest',
		mode: 'dark',
		colors: {
			bg: '#0e1a12', bg2: '#12221a', surface: 'rgba(24,48,34,.7)', surface2: 'rgba(34,66,48,.75)',
			border: 'rgba(130,200,140,.2)', text: '#e8f4e6', textDim: '#8fb094',
			accent: '#7ccf5b', accent2: '#e6c35c', accentText: '#0a1a0c', danger: '#e0675a', success: '#7ccf5b',
		},
		background: {
			image: 'radial-gradient(900px 520px at 10% -10%, rgba(124,207,91,.22), transparent 60%), radial-gradient(700px 480px at 100% 100%, rgba(230,195,92,.14), transparent 60%)',
			blur: 0, dim: 0,
		},
		fonts: { body: TREB, heading: TREB, mono: MONO },
		shape: { radius: 16, buttonStyle: 'solid', cardStyle: 'glass' },
		effects: { speed: 240, hover: 'lift', blur: 12, glow: 0.25, grain: 0.06 },
	}),
	t({
		id: 'ocean-depth',
		name: 'Ocean Depth',
		mode: 'dark',
		colors: {
			bg: '#04101f', bg2: '#071a30', surface: 'rgba(10,38,70,.62)', surface2: 'rgba(16,58,100,.7)',
			border: 'rgba(80,170,255,.2)', text: '#e4f1ff', textDim: '#7fa6cc',
			accent: '#3ea0ff', accent2: '#47e0d0', accentText: '#04101f', danger: '#ff6b6b', success: '#47e0a0',
		},
		background: {
			image: 'linear-gradient(180deg, rgba(62,160,255,.18), transparent 40%), radial-gradient(900px 600px at 50% 120%, rgba(71,224,208,.22), transparent 60%)',
			blur: 0, dim: 0,
		},
		shape: { radius: 20, buttonStyle: 'pill', cardStyle: 'glass' },
		effects: { speed: 300, hover: 'glow', blur: 20, glow: 0.5, grain: 0 },
	}),
	t({
		id: 'sunset-synth',
		name: 'Sunset Synth',
		mode: 'dark',
		colors: {
			bg: '#150a24', bg2: '#1d0d33', surface: 'rgba(54,20,80,.6)', surface2: 'rgba(80,28,110,.65)',
			border: 'rgba(255,110,180,.28)', text: '#fff0fa', textDim: '#c59ad8',
			accent: '#ff4fa3', accent2: '#ffb347', accentText: '#26001a', danger: '#ff5470', success: '#5ef0b4',
		},
		background: {
			image: 'linear-gradient(180deg, rgba(255,79,163,.2), transparent 45%), radial-gradient(900px 500px at 50% 115%, rgba(255,179,71,.3), transparent 60%)',
			blur: 0, dim: 0,
		},
		fonts: { body: SANS, heading: "Impact, 'Arial Black', sans-serif", mono: MONO },
		shape: { radius: 6, buttonStyle: 'outline', cardStyle: 'glass' },
		effects: { speed: 200, hover: 'glow', blur: 10, glow: 0.9, grain: 0.07 },
	}),
	t({
		id: 'terminal-green',
		name: 'Terminal',
		mode: 'dark',
		colors: {
			bg: '#020a04', bg2: '#04120a', surface: '#06170c', surface2: '#0a2212',
			border: '#14532d', text: '#9dffb0', textDim: '#4fae68',
			accent: '#39ff6a', accent2: '#c6ff3d', accentText: '#012008', danger: '#ff5a5a', success: '#39ff6a',
		},
		fonts: { body: MONO, heading: MONO, mono: MONO },
		shape: { radius: 0, buttonStyle: 'sharp', cardStyle: 'outlined' },
		effects: { speed: 90, hover: 'glow', blur: 0, glow: 0.6, grain: 0.08 },
		customCss: `.titlebar .brand::after{content:'_';animation:novaBlink 1s steps(1) infinite}@keyframes novaBlink{50%{opacity:0}}`,
	}),
	t({
		id: 'obsidian-gold',
		name: 'Obsidian Gold',
		mode: 'dark',
		colors: {
			bg: '#0b0b0c', bg2: '#111113', surface: 'rgba(24,24,26,.85)', surface2: 'rgba(36,34,30,.9)',
			border: 'rgba(212,175,55,.28)', text: '#f3ead2', textDim: '#a39877',
			accent: '#d4af37', accent2: '#f5d878', accentText: '#1a1400', danger: '#e5584b', success: '#7bc47f',
		},
		fonts: { body: SANS, heading: SERIF, mono: MONO },
		shape: { radius: 10, buttonStyle: 'outline', cardStyle: 'raised' },
		effects: { speed: 260, hover: 'lift', blur: 8, glow: 0.3, grain: 0.04 },
	}),
	t({
		id: 'oled-black',
		name: 'OLED Black',
		mode: 'dark',
		colors: {
			bg: '#000000', bg2: '#000000', surface: '#0c0c0c', surface2: '#161616',
			border: '#222222', text: '#f2f2f2', textDim: '#8a8a8a',
			accent: '#ffffff', accent2: '#8a8a8a', accentText: '#000000', danger: '#ff4d4d', success: '#4dff9a',
		},
		shape: { radius: 12, buttonStyle: 'solid', cardStyle: 'outlined' },
		effects: { speed: 150, hover: 'lift', blur: 0, glow: 0, grain: 0 },
	}),

	t({
		id: 'secret-nova',
		name: '✦ Secret Nova',
		mode: 'dark',
		colors: {
			bg: '#050508', bg2: '#0c0c12', surface: 'rgba(40,20,60,.7)', surface2: 'rgba(60,30,90,.75)',
			border: 'rgba(255,215,0,.35)', text: '#fff8e7', textDim: '#c4b89a',
			accent: '#ffd700', accent2: '#ff6bcb', accentText: '#1a1000', danger: '#ff4d6a', success: '#5dffb0',
		},
		background: {
			image: 'radial-gradient(700px 400px at 20% 0%, rgba(255,215,0,.25), transparent 55%), radial-gradient(600px 400px at 100% 100%, rgba(255,107,203,.2), transparent 50%)',
			blur: 0, dim: 0,
		},
		effects: { speed: 180, hover: 'glow', blur: 18, glow: 0.9, grain: 0.08 },
	}),
]

export const DEFAULT_THEME_ID = 'midnight-neon'
