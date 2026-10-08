import { computed, ref, watch } from 'vue'

import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin'
import type { Theme } from './types'
import { autoTheme, themeIdForNow, seasonalThemeId } from '../core/features'

const KEY_CUSTOM = 'nova.themes.custom'
const KEY_ACTIVE = 'nova.themes.active'

function read<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key)
		return raw ? (JSON.parse(raw) as T) : fallback
	} catch {
		return fallback
	}
}
function write(key: string, value: unknown) {
	try {
		localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
	} catch {
		/* storage full / blocked */
	}
}

export const customThemes = ref<Theme[]>(read<Theme[]>(KEY_CUSTOM, []))
export const activeThemeId = ref<string>(
	(() => {
		try {
			return localStorage.getItem(KEY_ACTIVE) || DEFAULT_THEME_ID
		} catch {
			return DEFAULT_THEME_ID
		}
	})(),
)

export const allThemes = computed<Theme[]>(() => [...BUILTIN_THEMES, ...customThemes.value])
export const activeTheme = computed<Theme>(
	() =>
		allThemes.value.find((x) => x.id === activeThemeId.value) ??
		BUILTIN_THEMES.find((x) => x.id === DEFAULT_THEME_ID)!,
)

/** Преобразует тему в набор CSS-переменных */
export function themeToVars(th: Theme): Record<string, string> {
	const c = th.colors
	return {
		'--bg': c.bg,
		'--bg-2': c.bg2,
		'--surface': c.surface,
		'--surface-2': c.surface2,
		'--border': c.border,
		'--text': c.text,
		'--text-dim': c.textDim,
		'--accent': c.accent,
		'--accent-2': c.accent2,
		'--accent-text': c.accentText,
		'--danger': c.danger,
		'--success': c.success,
		'--font-body': th.fonts.body,
		'--font-head': th.fonts.heading,
		'--font-mono': th.fonts.mono,
		'--radius': `${th.shape.radius}px`,
		'--radius-sm': `${Math.max(2, Math.round(th.shape.radius * 0.55))}px`,
		'--radius-btn': th.shape.buttonStyle === 'pill' ? '999px' : th.shape.buttonStyle === 'sharp' ? '0px' : `${Math.max(2, Math.round(th.shape.radius * 0.7))}px`,
		'--speed': `${th.effects.speed}ms`,
		'--blur': `${th.effects.blur}px`,
		'--glow': String(th.effects.glow),
		'--grain': String(th.effects.grain),
		'--bg-image': th.background.image || 'none',
		'--bg-blur': `${th.background.blur}px`,
		'--bg-dim': String(th.background.dim),
		color_scheme: th.mode,
	}
}

let styleEl: HTMLStyleElement | null = null

/** Применяет тему к документу (с плавным переходом) */
export function applyTheme(th: Theme, animate = true) {
	const root = document.documentElement
	if (animate) {
		root.classList.add('theme-switching')
		window.setTimeout(() => root.classList.remove('theme-switching'), 600)
	}
	for (const [k, v] of Object.entries(themeToVars(th))) {
		if (k === 'color_scheme') root.style.colorScheme = v
		else root.style.setProperty(k, v)
	}
	root.dataset.card = th.shape.cardStyle
	root.dataset.button = th.shape.buttonStyle
	root.dataset.hover = th.effects.hover
	root.dataset.mode = th.mode
	if (!styleEl) {
		styleEl = document.createElement('style')
		styleEl.id = 'nova-theme-custom-css'
		document.head.appendChild(styleEl)
	}
	styleEl.textContent = th.customCss ?? ''
}

export function setActiveTheme(id: string) {
	activeThemeId.value = id
	write(KEY_ACTIVE, id)
}

export function initThemes() {
	applyTheme(activeTheme.value, false)
	watch(activeTheme, (th) => applyTheme(th, true), { deep: true })
	watch(customThemes, (v) => write(KEY_CUSTOM, v), { deep: true })
}

export function uid() {
	return 'custom-' + Math.random().toString(36).slice(2, 9)
}

export function cloneTheme(src: Theme, name?: string): Theme {
	const copy: Theme = JSON.parse(JSON.stringify(src))
	copy.id = uid()
	copy.name = name ?? `${src.name} (копия)`
	copy.builtin = false
	copy.author = 'Я'
	return copy
}

export function saveCustomTheme(th: Theme) {
	th.builtin = false
	const i = customThemes.value.findIndex((x) => x.id === th.id)
	if (i >= 0) customThemes.value.splice(i, 1, th)
	else customThemes.value.push(th)
}

export function deleteCustomTheme(id: string) {
	customThemes.value = customThemes.value.filter((x) => x.id !== id)
	if (activeThemeId.value === id) setActiveTheme(DEFAULT_THEME_ID)
}

/** Проверка и нормализация JSON темы при импорте (недостающие поля берутся из базовой) */
export function parseThemeJson(text: string): Theme {
	const raw = JSON.parse(text)
	if (!raw || typeof raw !== 'object') throw new Error('Некорректный JSON темы')
	const base = BUILTIN_THEMES.find((x) => x.id === DEFAULT_THEME_ID)!
	const th: Theme = {
		...JSON.parse(JSON.stringify(base)),
		...raw,
		colors: { ...base.colors, ...(raw.colors ?? {}) },
		fonts: { ...base.fonts, ...(raw.fonts ?? {}) },
		shape: { ...base.shape, ...(raw.shape ?? {}) },
		effects: { ...base.effects, ...(raw.effects ?? {}) },
		background: { ...base.background, ...(raw.background ?? {}) },
	}
	if (!raw.name) throw new Error('В теме нет поля "name"')
	th.id = uid()
	th.builtin = false
	th.mode = raw.mode === 'light' ? 'light' : 'dark'
	return th
}

let autoThemeTimer: number | null = null

export function startAutoThemeWatcher() {
	const tick = () => {
		const seasonal = seasonalThemeId()
		if (seasonal) {
			if (seasonal !== activeThemeId.value) setActiveTheme(seasonal)
			return
		}
		if (!autoTheme.value.enabled) return
		const id = themeIdForNow()
		if (id && id !== activeThemeId.value) {
			setActiveTheme(id)
		}
	}
	tick()
	if (autoThemeTimer) window.clearInterval(autoThemeTimer)
	autoThemeTimer = window.setInterval(tick, 60_000)
	watch(
		() => autoTheme.value.enabled,
		(on) => {
			if (on) tick()
		},
	)
}
