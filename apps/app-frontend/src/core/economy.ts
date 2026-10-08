/**
 * Nova economy: Sparks currency, shop, achievements, daily streak, quotes.
 * All persisted in localStorage. i18n via features.t / title keys.
 */
import { computed, ref, watch } from 'vue'

import { lang, t } from './features'

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
		localStorage.setItem(key, JSON.stringify(value))
	} catch {
		/* ignore */
	}
}

// ─── Currency ──────────────────────────────────────────────────────────────
const BAL_KEY = 'nova.sparks'
export const sparks = ref<number>(read(BAL_KEY, 0))
watch(sparks, (v) => write(BAL_KEY, v))

export function addSparks(n: number, reason?: string) {
	if (n <= 0) return
	sparks.value = Math.min(999_999, sparks.value + Math.floor(n))
	if (reason) lastEarn.value = { n: Math.floor(n), reason, at: Date.now() }
}
export function spendSparks(n: number): boolean {
	if (sparks.value < n) return false
	sparks.value -= n
	return true
}

export const lastEarn = ref<{ n: number; reason: string; at: number } | null>(null)

// ─── Daily streak ──────────────────────────────────────────────────────────
const STREAK_KEY = 'nova.streak'
export interface StreakData {
	lastDay: string // YYYY-MM-DD
	count: number
}
export const streak = ref<StreakData>(read(STREAK_KEY, { lastDay: '', count: 0 }))
watch(streak, (v) => write(STREAK_KEY, v), { deep: true })

function todayStr() {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function yesterdayStr() {
	const d = new Date()
	d.setDate(d.getDate() - 1)
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Call on launcher bootstrap */
export function claimDailyLogin(): number {
	const today = todayStr()
	if (streak.value.lastDay === today) return 0
	const cont = streak.value.lastDay === yesterdayStr()
	streak.value = { lastDay: today, count: cont ? streak.value.count + 1 : 1 }
	const bonus = 15 + Math.min(streak.value.count, 14) * 5 // 15..85
	addSparks(bonus, 'daily')
	unlockAch('daily_login')
	if (streak.value.count >= 7) unlockAch('streak_7')
	return bonus
}

// ─── Owned cosmetics ───────────────────────────────────────────────────────
const OWNED_KEY = 'nova.owned'
const EQUIP_KEY = 'nova.equipped'
export const owned = ref<string[]>(read(OWNED_KEY, ['title_none']))
export const equipped = ref<Record<string, string>>(
	read(EQUIP_KEY, { title: 'title_none', gameover: 'go_default', win_sound: 'win_default' }),
)
watch(owned, (v) => write(OWNED_KEY, v), { deep: true })
watch(equipped, (v) => write(EQUIP_KEY, v), { deep: true })

export function hasItem(id: string) {
	return owned.value.includes(id)
}
export function equipItem(slot: string, id: string) {
	if (!hasItem(id) && id !== 'title_none' && id !== 'go_default' && id !== 'win_default') return
	equipped.value = { ...equipped.value, [slot]: id }
}

// ─── Shop catalog ──────────────────────────────────────────────────────────
export type ShopItem = {
	id: string
	slot: 'title' | 'gameover' | 'win_sound' | 'theme' | 'mode'
	price: number
	/** i18n keys */
	nameKey: string
	descKey: string
	secret?: boolean
}

export const SHOP_ITEMS: ShopItem[] = [
	{ id: 'title_pioneer', slot: 'title', price: 120, nameKey: 'shop_title_pioneer', descKey: 'shop_title_pioneer_d' },
	{ id: 'title_speedrunner', slot: 'title', price: 200, nameKey: 'shop_title_speedrunner', descKey: 'shop_title_speedrunner_d' },
	{ id: 'title_builder', slot: 'title', price: 150, nameKey: 'shop_title_builder', descKey: 'shop_title_builder_d' },
	{ id: 'title_nightowl', slot: 'title', price: 180, nameKey: 'shop_title_nightowl', descKey: 'shop_title_nightowl_d' },
	{ id: 'title_legend', slot: 'title', price: 500, nameKey: 'shop_title_legend', descKey: 'shop_title_legend_d' },
	{ id: 'go_glitch', slot: 'gameover', price: 80, nameKey: 'shop_go_glitch', descKey: 'shop_go_glitch_d' },
	{ id: 'go_nova', slot: 'gameover', price: 100, nameKey: 'shop_go_nova', descKey: 'shop_go_nova_d' },
	{ id: 'go_matrix', slot: 'gameover', price: 140, nameKey: 'shop_go_matrix', descKey: 'shop_go_matrix_d' },
	{ id: 'win_chime', slot: 'win_sound', price: 60, nameKey: 'shop_win_chime', descKey: 'shop_win_chime_d' },
	{ id: 'win_fanfare', slot: 'win_sound', price: 90, nameKey: 'shop_win_fanfare', descKey: 'shop_win_fanfare_d' },
	{ id: 'mode_mirror', slot: 'mode', price: 250, nameKey: 'shop_mode_mirror', descKey: 'shop_mode_mirror_d' },
	{ id: 'mode_speed', slot: 'mode', price: 300, nameKey: 'shop_mode_speed', descKey: 'shop_mode_speed_d' },
	{ id: 'theme_secret', slot: 'theme', price: 9999, nameKey: 'shop_theme_secret', descKey: 'shop_theme_secret_d', secret: true },
]

export function buyItem(id: string): { ok: boolean; msg: string } {
	const item = SHOP_ITEMS.find((x) => x.id === id)
	if (!item) return { ok: false, msg: 'not_found' }
	if (hasItem(id)) return { ok: false, msg: 'owned' }
	if (!spendSparks(item.price)) return { ok: false, msg: 'no_money' }
	owned.value = [...owned.value, id]
	equipItem(item.slot === 'mode' ? 'mode' : item.slot, id)
	if (id === 'theme_secret') {
		unlockAch('secret_theme')
		void import('../themes/engine').then((m) => m.setActiveTheme('secret-nova')).catch(() => {})
	}
	unlockAch('first_buy')
	return { ok: true, msg: 'bought' }
}

export function titleLabel(): string {
	const id = equipped.value.title || 'title_none'
	if (id === 'title_none') return ''
	const map: Record<string, [string, string]> = {
		title_pioneer: ['Pioneer', 'Пионер'],
		title_speedrunner: ['Speedrunner', 'Спидраннер'],
		title_builder: ['Builder', 'Строитель'],
		title_nightowl: ['Night Owl', 'Ночная сова'],
		title_legend: ['Legend', 'Легенда'],
	}
	const pair = map[id]
	if (!pair) return ''
	return lang.value === 'en' ? pair[0] : pair[1]
}

// ─── Achievements ──────────────────────────────────────────────────────────
export type AchDef = {
	id: string
	nameKey: string
	descKey: string
	icon: string
	sparks?: number
}

export const ACHIEVEMENTS: AchDef[] = [
	{ id: 'hello_nova', nameKey: 'ach_hello', descKey: 'ach_hello_d', icon: '✨', sparks: 25 },
	{ id: 'first_instance', nameKey: 'ach_first_inst', descKey: 'ach_first_inst_d', icon: '🧱', sparks: 40 },
	{ id: 'first_launch', nameKey: 'ach_first_launch', descKey: 'ach_first_launch_d', icon: '🚀', sparks: 50 },
	{ id: 'play_1h', nameKey: 'ach_1h', descKey: 'ach_1h_d', icon: '⏱️', sparks: 80 },
	{ id: 'play_10h', nameKey: 'ach_10h', descKey: 'ach_10h_d', icon: '🌙', sparks: 200 },
	{ id: 'tetris_first', nameKey: 'ach_tetris', descKey: 'ach_tetris_d', icon: '🎮', sparks: 30 },
	{ id: 'tetris_record', nameKey: 'ach_record', descKey: 'ach_record_d', icon: '🏆', sparks: 60 },
	{ id: 'daily_login', nameKey: 'ach_daily', descKey: 'ach_daily_d', icon: '📅', sparks: 15 },
	{ id: 'streak_7', nameKey: 'ach_streak', descKey: 'ach_streak_d', icon: '🔥', sparks: 100 },
	{ id: 'first_buy', nameKey: 'ach_buy', descKey: 'ach_buy_d', icon: '🛒', sparks: 20 },
	{ id: 'secret_theme', nameKey: 'ach_secret', descKey: 'ach_secret_d', icon: '💎', sparks: 0 },
]

const UNLOCKED_KEY = 'nova.achs'
export const unlockedAchs = ref<string[]>(read(UNLOCKED_KEY, []))
watch(unlockedAchs, (v) => write(UNLOCKED_KEY, v), { deep: true })

export const lastAch = ref<{ id: string; at: number } | null>(null)

/** Steam-style bottom-right popups */
export type AchPopup = { uid: number; id: string; at: number }
export const achPopups = ref<AchPopup[]>([])
let achPopupUid = 0

function pushAchPopup(id: string) {
	const uid = ++achPopupUid
	achPopups.value = [...achPopups.value, { uid, id, at: Date.now() }]
	setTimeout(() => {
		achPopups.value = achPopups.value.filter((p) => p.uid !== uid)
	}, 5500)
}

export function unlockAch(id: string) {
	if (unlockedAchs.value.includes(id)) return
	const def = ACHIEVEMENTS.find((a) => a.id === id)
	if (!def) return
	unlockedAchs.value = [...unlockedAchs.value, id]
	lastAch.value = { id, at: Date.now() }
	pushAchPopup(id)
	if (def.sparks) addSparks(def.sparks, 'ach')
}

// ─── Admin (local only) ────────────────────────────────────────────────────
const ADMIN_PASS = 'ren_tor12_14'
const ADMIN_KEY = 'nova.adminUnlocked'
export const adminUnlocked = ref(localStorage.getItem(ADMIN_KEY) === '1')

export function tryAdminLogin(password: string): boolean {
	if (password === ADMIN_PASS) {
		adminUnlocked.value = true
		try { localStorage.setItem(ADMIN_KEY, '1') } catch {}
		return true
	}
	return false
}

export function adminLogout() {
	adminUnlocked.value = false
	try { localStorage.removeItem(ADMIN_KEY) } catch {}
}

export function adminGrantSparks(n: number) {
	addSparks(Math.max(0, Math.floor(n)), 'admin')
}

export function adminSetSparks(n: number) {
	sparks.value = Math.max(0, Math.floor(n))
}

export function adminUnlockAllAchs() {
	for (const a of ACHIEVEMENTS) {
		if (!unlockedAchs.value.includes(a.id)) {
			unlockedAchs.value = [...unlockedAchs.value, a.id]
			pushAchPopup(a.id)
		}
	}
}

export function adminResetAchs() {
	unlockedAchs.value = []
	lastAch.value = null
	achPopups.value = []
}

export function adminResetEconomy() {
	sparks.value = 0
	owned.value = ['title_none']
	equipped.value = { title: 'title_none', gameover: 'go_default', win_sound: 'win_default' }
	streak.value = { lastDay: '', count: 0 }
	progress.value = {
		launchedInstances: [],
		totalPlaySecAwarded: 0,
		tetrisGames: 0,
		tetrisBestAwarded: 0,
	}
	adminResetAchs()
}

export function adminUnlockAllShop() {
	const ids = SHOP_ITEMS.map((i) => i.id)
	owned.value = Array.from(new Set([...owned.value, ...ids, 'title_none']))
}


export const unlockedCount = computed(() => unlockedAchs.value.length)

// ─── Progress tracking helpers ─────────────────────────────────────────────
const PROG_KEY = 'nova.progress'
export interface Progress {
	launchedInstances: string[]
	totalPlaySecAwarded: number // hours already paid for
	tetrisGames: number
	tetrisBestAwarded: number
}
export const progress = ref<Progress>(
	read(PROG_KEY, {
		launchedInstances: [],
		totalPlaySecAwarded: 0,
		tetrisGames: 0,
		tetrisBestAwarded: 0,
	}),
)
watch(progress, (v) => write(PROG_KEY, v), { deep: true })

/** First launch of an instance */
export function onInstanceLaunch(instanceId: string) {
	const first = !progress.value.launchedInstances.includes(instanceId)
	if (first) {
		progress.value = {
			...progress.value,
			launchedInstances: [...progress.value.launchedInstances, instanceId],
		}
		addSparks(35, 'first_instance_run')
		unlockAch('first_launch')
	} else {
		addSparks(8, 'session')
	}
}

/** Call with total submitted_time_played sum across instances */
export function onPlaytimeSync(totalSec: number) {
	const hours = Math.floor(totalSec / 3600)
	const awardedHours = Math.floor(progress.value.totalPlaySecAwarded / 3600)
	if (hours > awardedHours) {
		const delta = hours - awardedHours
		addSparks(delta * 25, 'playtime')
		progress.value = { ...progress.value, totalPlaySecAwarded: hours * 3600 }
	}
	if (totalSec >= 3600) unlockAch('play_1h')
	if (totalSec >= 36000) unlockAch('play_10h')
}

/** Generic mini-game reward (snake, minesweeper, …) */
export function onMiniGameScore(gameId: string, score: number, opts?: { isWin?: boolean; isNewRecord?: boolean }) {
	const earn = Math.min(150, Math.floor(score / 20) + (opts?.isWin ? 25 : 5))
	addSparks(Math.max(3, earn), gameId)
	if (opts?.isWin) unlockAch('tetris_first') // first mini-game play vibe; specific achs optional
	if (gameId === 'snake' && opts?.isNewRecord) addSparks(20, 'snake_record')
	if (gameId === 'mines' && opts?.isWin) addSparks(30, 'mines_win')
}

export function onTetrisScore(score: number, linesCleared: number, isNewRecord: boolean) {
	progress.value = { ...progress.value, tetrisGames: progress.value.tetrisGames + 1 }
	if (progress.value.tetrisGames === 1) unlockAch('tetris_first')
	// ~1 spark per 50 points + 3 per line
	const earn = Math.floor(score / 50) + linesCleared * 3
	addSparks(Math.min(earn, 200), 'tetris')
	if (isNewRecord && score > progress.value.tetrisBestAwarded) {
		addSparks(40, 'tetris_record')
		progress.value = { ...progress.value, tetrisBestAwarded: score }
		unlockAch('tetris_record')
	}
}

export function onInstanceCreated() {
	unlockAch('first_instance')
}

// ─── Quotes ────────────────────────────────────────────────────────────────
const QUOTES_RU = [
	'Один мод — хорошо, сто — приключение.',
	'Сегодня хороший день, чтобы не читать changelog.',
	'Nova на связи. Сборки тоже.',
	'Если лаги — виноват не лаунчер. Наверное.',
	'Сначала бэкап мира. Потом «а что если…».',
	'Tetris ждёт, пока качается Sodium.',
	'Ты не застрял в меню — ты стратегируешь.',
	'Спарк за спарком — и секретная тема уже ближе.',
]
const QUOTES_EN = [
	'One mod is fine. A hundred is an adventure.',
	'Great day to skip the changelog.',
	'Nova online. So are your instances.',
	'If it lags — probably not the launcher.',
	'Backup the world first. Then “what if…”.',
	'Tetris waits while Sodium downloads.',
	"You're not stuck in the menu — you're strategizing.",
	'Spark by spark — the secret theme gets closer.',
]

export function randomQuote(): string {
	const list = lang.value === 'en' ? QUOTES_EN : QUOTES_RU
	return list[Math.floor(Math.random() * list.length)]
}

export const bootQuote = ref('')
export function initEconomyOnBoot() {
	claimDailyLogin()
	unlockAch('hello_nova')
	bootQuote.value = randomQuote()
}

// ─── Win sound helper ──────────────────────────────────────────────────────
export function playWinSound() {
	const id = equipped.value.win_sound || 'win_default'
	try {
		const ctx = new AudioContext()
		const seq =
			id === 'win_fanfare'
				? [262, 330, 392, 523]
				: id === 'win_chime'
					? [523, 659, 784]
					: [440, 554]
		seq.forEach((f, i) => {
			const o = ctx.createOscillator()
			const g = ctx.createGain()
			o.frequency.value = f
			o.type = 'sine'
			g.gain.value = 0.15
			o.connect(g)
			g.connect(ctx.destination)
			const t0 = ctx.currentTime + i * 0.12
			g.gain.setValueAtTime(0.15, t0)
			g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25)
			o.start(t0)
			o.stop(t0 + 0.3)
		})
	} catch {
		/* ignore */
	}
}

export function gameOverStyle(): string {
	return equipped.value.gameover || 'go_default'
}
