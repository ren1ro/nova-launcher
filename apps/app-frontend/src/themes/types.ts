export type CardStyle = 'flat' | 'glass' | 'outlined' | 'raised'
export type ButtonStyle = 'solid' | 'pill' | 'outline' | 'soft' | 'sharp'
export type HoverFx = 'lift' | 'glow' | 'none'

export interface Theme {
	id: string
	name: string
	author?: string
	mode: 'dark' | 'light'
	/** Цвета (CSS-значения) */
	colors: {
		bg: string
		bg2: string
		surface: string
		surface2: string
		border: string
		text: string
		textDim: string
		accent: string
		accent2: string
		accentText: string
		danger: string
		success: string
	}
	fonts: { body: string; heading: string; mono: string }
	shape: { radius: number; buttonStyle: ButtonStyle; cardStyle: CardStyle }
	effects: {
		/** скорость анимаций, мс */
		speed: number
		hover: HoverFx
		/** размытие стеклянных поверхностей, px */
		blur: number
		/** сила свечения акцента 0..1 */
		glow: number
		/** зернистость (шум) 0..1 */
		grain: number
	}
	background: {
		/** любое значение CSS background-image: gradient(...) или url(data:...) */
		image: string
		/** размытие фоновой картинки, px */
		blur: number
		/** затемнение 0..1 */
		dim: number
	}
	/** Произвольный CSS — полный контроль над любым элементом */
	customCss?: string
	builtin?: boolean
}

export const FONT_PRESETS: { label: string; value: string }[] = [
	{ label: 'Системный (Segoe UI)', value: "'Segoe UI', system-ui, -apple-system, sans-serif" },
	{ label: 'Trebuchet', value: "'Trebuchet MS', 'Segoe UI', sans-serif" },
	{ label: 'Verdana', value: "Verdana, 'Segoe UI', sans-serif" },
	{ label: 'Georgia (с засечками)', value: "Georgia, 'Times New Roman', serif" },
	{ label: 'Palatino', value: "'Palatino Linotype', Palatino, serif" },
	{ label: 'Impact (плакатный)', value: "Impact, 'Arial Black', sans-serif" },
	{ label: 'Consolas (моно)', value: "Consolas, 'Cascadia Mono', 'Courier New', monospace" },
	{ label: 'Courier New', value: "'Courier New', Courier, monospace" },
	{ label: 'Comic Sans', value: "'Comic Sans MS', 'Chalkboard SE', cursive" },
]
