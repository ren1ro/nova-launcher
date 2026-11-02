import { ref, watch } from 'vue'

/** Sidebar / nav slots that can be restyled */
export type NavIconSlot =
	| 'library'
	| 'browse'
	| 'accounts'
	| 'themes'
	| 'settings'
	| 'tetris'
	| 'shop'
	| 'ai'

export const NAV_ICON_SLOTS: { id: NavIconSlot; labelKey: string; defaultIcon: string }[] = [
	{ id: 'library', labelKey: 'library', defaultIcon: 'library' },
	{ id: 'browse', labelKey: 'browse', defaultIcon: 'store' },
	{ id: 'accounts', labelKey: 'accounts', defaultIcon: 'user' },
	{ id: 'themes', labelKey: 'themes', defaultIcon: 'palette' },
	{ id: 'settings', labelKey: 'settings', defaultIcon: 'settings' },
	{ id: 'tetris', labelKey: 'games', defaultIcon: 'tetris' },
	{ id: 'shop', labelKey: 'shop', defaultIcon: 'star' },
	{ id: 'ai', labelKey: 'ai', defaultIcon: 'spark' },
]

/** Built-in SVG icon names users can pick from */
export const BUILTIN_ICON_NAMES = [
	'library',
	'store',
	'user',
	'palette',
	'settings',
	'tetris',
	'star',
	'spark',
	'play',
	'folder',
	'grid',
	'list',
	'search',
	'download',
	'upload',
	'check',
	'edit',
	'admin',
	'plus',
	'refresh',
	'copy',
	'trash',
	'back',
	'close',
] as const

export type IconValue =
	| { type: 'builtin'; name: string }
	| { type: 'image'; dataUrl: string }
	| { type: 'emoji'; emoji: string }

export type IconPack = Partial<Record<NavIconSlot, IconValue>>

const KEY = 'nova.iconPack'

function read(): IconPack {
	try {
		const raw = localStorage.getItem(KEY)
		if (!raw) return {}
		return JSON.parse(raw) as IconPack
	} catch {
		return {}
	}
}

export const iconPack = ref<IconPack>(read())

watch(
	iconPack,
	(v) => {
		try {
			localStorage.setItem(KEY, JSON.stringify(v))
		} catch {
			/* */
		}
	},
	{ deep: true },
)

export function getSlotIcon(slot: NavIconSlot, fallback: string): IconValue {
	return iconPack.value[slot] ?? { type: 'builtin', name: fallback }
}

export function setSlotIcon(slot: NavIconSlot, value: IconValue | null) {
	if (!value) {
		const next = { ...iconPack.value }
		delete next[slot]
		iconPack.value = next
		return
	}
	iconPack.value = { ...iconPack.value, [slot]: value }
}

export function resetIconPack() {
	iconPack.value = {}
}

export function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const r = new FileReader()
		r.onload = () => resolve(String(r.result))
		r.onerror = () => reject(r.error)
		r.readAsDataURL(file)
	})
}
