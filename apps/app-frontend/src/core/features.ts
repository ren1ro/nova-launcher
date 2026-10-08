/**
 * Nova extras: streamer, groups, live bg, auto theme, random modpack, i18n, launch history.
 */
import { computed, ref, watch } from 'vue'

import type { Instance } from './api'
import * as modrinth from './modrinth'
import * as api from './api'

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
		/* ignore */
	}
}

// ─── i18n ──────────────────────────────────────────────────────────────────
export type Lang = 'ru' | 'en'
const LANG_KEY = 'nova.lang'
export const lang = ref<Lang>((localStorage.getItem(LANG_KEY) as Lang) || 'ru')
watch(lang, (v) => {
	try {
		localStorage.setItem(LANG_KEY, v)
	} catch {
		/* ignore */
	}
	document.documentElement.lang = v
})

const dict: Record<Lang, Record<string, string>> = {
	ru: {
		library: 'Библиотека',
		browse: 'Каталог',
		accounts: 'Аккаунты',
		themes: 'Темы',
		settings: 'Настройки',
		play: 'Играть',
		stop: 'Стоп',
		launching: 'Запуск',
		ready: 'Готова',
		running: 'Запущена',
		installing: 'Установка',
		notInstalled: 'Не установлена',
		favorites: 'Избранные',
		groups: 'Группы',
		refresh: 'Обновить',
		createInstance: 'Создать сборку',
		whatToPlay: 'Во что поиграть?',
		randomLocal: 'Случайная из библиотеки',
		randomModpack: 'Случайный модпак с Modrinth',
		streamerMode: 'Режим стримера',
		streamerOn: 'Стрим ON',
		streamer: 'Стример',
		notLoggedIn: 'Не вошли',
		clickToLogin: 'Нажмите, чтобы войти',
		hidden: 'скрыто',
		history: 'История',
		noHistory: 'Пока нет запусков',
		hoursPlayed: 'Наиграно',
		ago: 'назад',
		language: 'Язык',
		liveBg: 'Живые фоны',
		customBg: 'Свой фон (URL картинки)',
		bgPreset: 'Пресет анимации',
		intensity: 'Интенсивность',
		speed: 'Скорость',
		autoTheme: 'Тема по времени суток',
		content: 'Содержимое',
		groupColor: 'Группа и цвет',
		noGroup: 'Без группы',
		labelColor: 'Цвет метки',
		reset: 'сброс',
		search: 'Поиск по названию или версии…',
		allLoaders: 'Все загрузчики',
		allGroups: 'Все группы',
		noGroupFilter: 'Без группы',
		recentlyPlayed: 'Недавно сыгранные',
		byName: 'По имени',
		newest: 'Новые',
		byPlaytime: 'По времени игры',
		save: 'Сохранить',
		globalSettings: 'Глобальные параметры запуска и уникальные фичи Nova.',
		hideNickname: 'Скрывать никнейм',
		hideToasts: 'Отключить уведомления',
		compactWindow: 'Компактное окно',
		blurAvatars: 'Размыть аватар',
		hideAccountDetails: 'Скрыть детали аккаунта',
		enableStreamer: 'Включить режим стримера',
		enableLiveBg: 'Анимированный фон',
		none: 'Выкл',
		particles: 'Частицы',
		stars: 'Звёзды',
		aurora: 'Северное сияние',
		waves: 'Волны',
		image: 'Картинка (URL)',
		morning: 'Утро (6–11)',
		day: 'День (11–17)',
		evening: 'Вечер (17–22)',
		night: 'Ночь (22–6)',
		memory: 'Память (Java)',
		gameWindow: 'Окно игры',
		launcher: 'Лаунчер',
		shop: 'Магазин',
		sparks: 'Спарки',
		achievements: 'Достижения',
		buy: 'Купить',
		owned: 'Куплено',
		equip: 'Надеть',
		equipped: 'Надето',
		notEnough: 'Не хватает спарков',
		shop_title_pioneer: 'Титул: Пионер',
		shop_title_pioneer_d: 'Рядом с ником — Пионер',
		shop_title_speedrunner: 'Титул: Спидраннер',
		shop_title_speedrunner_d: 'Для тех, кто спешит',
		shop_title_builder: 'Титул: Строитель',
		shop_title_builder_d: 'Свой мир — свои правила',
		shop_title_nightowl: 'Титул: Ночная сова',
		shop_title_nightowl_d: 'Играет, когда все спят',
		shop_title_legend: 'Титул: Легенда',
		shop_title_legend_d: 'Редкий статус',
		shop_go_glitch: 'Game Over: Glitch',
		shop_go_glitch_d: 'Глитч-оверлей при проигрыше в Tetris',
		shop_go_nova: 'Game Over: Nova',
		shop_go_nova_d: 'Фирменный экран поражения',
		shop_go_matrix: 'Game Over: Matrix',
		shop_go_matrix_d: 'Зелёный дождь кода',
		shop_win_chime: 'Звук победы: Chime',
		shop_win_chime_d: 'Лёгкий перезвон при рекорде',
		shop_win_fanfare: 'Звук победы: Fanfare',
		shop_win_fanfare_d: 'Торжественный мотив',
		shop_mode_mirror: 'Tetris: Зеркало',
		shop_mode_mirror_d: 'Поле отражено — другой контроль',
		shop_mode_speed: 'Tetris: Скорость',
		shop_mode_speed_d: 'Ускоренный режим',
		shop_theme_secret: 'Секретная тема',
		shop_theme_secret_d: '9999 спарков. Легенда.',
		ach_hello: 'Привет, я Nova',
		ach_hello_d: 'Первый запуск лаунчера',
		ach_first_inst: 'Молодец',
		ach_first_inst_d: 'Создал первую сборку',
		ach_first_launch: 'Поехали',
		ach_first_launch_d: 'Первый запуск сборки',
		ach_1h: 'Разминка',
		ach_1h_d: '1 час в Minecraft',
		ach_10h: 'Вау, 10 часов',
		ach_10h_d: '10 часов в сборках',
		ach_tetris: 'Кирпичик',
		ach_tetris_d: 'Сыграл в Tetris',
		ach_record: 'Рекордсмен',
		ach_record_d: 'Новый рекорд в Tetris',
		ach_daily: 'Ежедневный вход',
		ach_daily_d: 'Зашёл в лаунчер сегодня',
		ach_streak: 'Неделя с Nova',
		ach_streak_d: '7 дней подряд',
		ach_buy: 'Шопоголик',
		ach_buy_d: 'Первая покупка в магазине',
		ach_secret: 'Секрет найден',
		ach_secret_d: 'Купил секретную тему',
		showcase: 'Витрина',
		quote: 'Цитата дня',
		games: 'Игры',
catalog: 'Каталог',
		catalogSub: 'Моды, модпаки, ресурспаки и шейдеры с Modrinth · установка через Theseus',
		mods: 'Моды',
		modpacks: 'Модпаки',
		resourcepacks: 'Ресурспаки',
		shaders: 'Шейдеры',
		datapacks: 'Датапаки',
		searchShort: 'Поиск…',
		byRelevance: 'По релевантности',
		byDownloads: 'По загрузкам',
		byFollows: 'По подпискам',
		byNewest: 'Сначала новые',
		byUpdated: 'По обновлению',
		compatibleOnly: 'Только совместимые',
		install: 'Установить',
		installed: 'Установлено',
		accountsSub: 'Вход через Theseus (Microsoft). Лаунчер не хранит пароли.',
		addAccount: 'Добавить аккаунт',
		waitingLogin: 'Ожидание окна входа…',
		active: 'Активный',
		makeDefault: 'Сделать основным',
		notSignedIn: 'Вы не вошли',
		notSignedInHint: 'Нажмите «Добавить аккаунт», войдите в Microsoft — затем можно запускать сборки.',
		loggedInAs: 'Вы вошли как',
		loginError: 'Ошибка входа',
		themesSub: 'темы · цвета, шрифты, фон, формы, эффекты',
		builtinDark: 'Встроенная · тёмная',
		builtinLight: 'Встроенная · светлая',
		customDark: 'Моя · тёмная',
		customLight: 'Моя · светлая',
		copy: 'Копия',
		editTheme: 'Изменить',
		import: 'Импорт',
		createTheme: 'Создать тему',
		themeCopied: 'Создана копия темы для редактирования',
		librarySub: 'сборок из папки Modrinth · запуск без оригинального окна',
		delete: 'Удалить',
		rename: 'Переименовать',
		duplicate: 'Копировать',
		repair: 'Переустановить',
		openFolder: 'Открыть папку',
		confirmDelete: 'Точно удалить?',
		addFile: 'Добавить файл',
		updateAll: 'Обновить всё',
		findInCatalog: 'Найти в каталоге',
		files: 'файлов',
		contentHint: 'включайте, отключайте, обновляйте и удаляйте',
		mb: 'МБ',
		kb: 'КБ',
		coreStarting: 'Запуск ядра…',
		coreFailed: 'Не удалось запустить ядро Theseus',
		coreFailedHint: 'Закройте оригинальный Modrinth App, если он запущен, и перезапустите лаунчер.',
		installingN: 'Установка',
		achUnlocked: 'Достижение получено',
		searchFailed: 'Поиск не удался',
		selectInstance: 'Выберите сборку',
		cancel: 'Отмена',
		myTheme: 'Моя тема',
	},
	en: {
		library: 'Library',
		browse: 'Browse',
		accounts: 'Accounts',
		themes: 'Themes',
		settings: 'Settings',
		play: 'Play',
		stop: 'Stop',
		launching: 'Launching',
		ready: 'Ready',
		running: 'Running',
		installing: 'Installing',
		notInstalled: 'Not installed',
		favorites: 'Favorites',
		groups: 'Groups',
		refresh: 'Refresh',
		createInstance: 'Create instance',
		whatToPlay: 'What to play?',
		randomLocal: 'Random from library',
		randomModpack: 'Random Modrinth modpack',
		streamerMode: 'Streamer mode',
		streamerOn: 'Stream ON',
		streamer: 'Streamer',
		notLoggedIn: 'Not signed in',
		clickToLogin: 'Click to sign in',
		hidden: 'hidden',
		history: 'History',
		noHistory: 'No launches yet',
		hoursPlayed: 'Played',
		ago: 'ago',
		language: 'Language',
		liveBg: 'Live backgrounds',
		customBg: 'Custom background (image URL)',
		bgPreset: 'Animation preset',
		intensity: 'Intensity',
		speed: 'Speed',
		autoTheme: 'Theme by time of day',
		content: 'Contents',
		groupColor: 'Group & color',
		noGroup: 'No group',
		labelColor: 'Label color',
		reset: 'reset',
		search: 'Search by name or version…',
		allLoaders: 'All loaders',
		allGroups: 'All groups',
		noGroupFilter: 'Ungrouped',
		recentlyPlayed: 'Recently played',
		byName: 'By name',
		newest: 'Newest',
		byPlaytime: 'By playtime',
		save: 'Save',
		globalSettings: 'Global launch settings and Nova features.',
		hideNickname: 'Hide nickname',
		hideToasts: 'Disable notifications',
		compactWindow: 'Compact window',
		blurAvatars: 'Blur avatar',
		hideAccountDetails: 'Hide account details',
		enableStreamer: 'Enable streamer mode',
		enableLiveBg: 'Animated background',
		none: 'Off',
		particles: 'Particles',
		stars: 'Stars',
		aurora: 'Aurora',
		waves: 'Waves',
		image: 'Image (URL)',
		morning: 'Morning (6–11)',
		day: 'Day (11–17)',
		evening: 'Evening (17–22)',
		night: 'Night (22–6)',
		memory: 'Memory (Java)',
		gameWindow: 'Game window',
		launcher: 'Launcher',
		shop: 'Shop',
		sparks: 'Sparks',
		achievements: 'Achievements',
		buy: 'Buy',
		owned: 'Owned',
		equip: 'Equip',
		equipped: 'Equipped',
		notEnough: 'Not enough Sparks',
		shop_title_pioneer: 'Title: Pioneer',
		shop_title_pioneer_d: 'Shows Pioneer next to your name',
		shop_title_speedrunner: 'Title: Speedrunner',
		shop_title_speedrunner_d: 'For those in a hurry',
		shop_title_builder: 'Title: Builder',
		shop_title_builder_d: 'Your world, your rules',
		shop_title_nightowl: 'Title: Night Owl',
		shop_title_nightowl_d: 'Plays when others sleep',
		shop_title_legend: 'Title: Legend',
		shop_title_legend_d: 'Rare status',
		shop_go_glitch: 'Game Over: Glitch',
		shop_go_glitch_d: 'Glitch overlay on Tetris loss',
		shop_go_nova: 'Game Over: Nova',
		shop_go_nova_d: 'Branded defeat screen',
		shop_go_matrix: 'Game Over: Matrix',
		shop_go_matrix_d: 'Green code rain',
		shop_win_chime: 'Win sound: Chime',
		shop_win_chime_d: 'Soft chime on high score',
		shop_win_fanfare: 'Win sound: Fanfare',
		shop_win_fanfare_d: 'Celebratory motif',
		shop_mode_mirror: 'Tetris: Mirror',
		shop_mode_mirror_d: 'Mirrored board — different control',
		shop_mode_speed: 'Tetris: Speed',
		shop_mode_speed_d: 'Faster drop speed',
		shop_theme_secret: 'Secret theme',
		shop_theme_secret_d: '9999 Sparks. Legendary.',
		ach_hello: 'Hello, I am Nova',
		ach_hello_d: 'First launcher launch',
		ach_first_inst: 'Well done',
		ach_first_inst_d: 'Created your first instance',
		ach_first_launch: 'Lift off',
		ach_first_launch_d: 'First instance launch',
		ach_1h: 'Warm-up',
		ach_1h_d: '1 hour in Minecraft',
		ach_10h: 'Wow, 10 hours',
		ach_10h_d: '10 hours across instances',
		ach_tetris: 'Brick by brick',
		ach_tetris_d: 'Played Tetris',
		ach_record: 'Record breaker',
		ach_record_d: 'New Tetris high score',
		ach_daily: 'Daily login',
		ach_daily_d: 'Opened the launcher today',
		ach_streak: 'Week with Nova',
		ach_streak_d: '7 days in a row',
		ach_buy: 'Shopper',
		ach_buy_d: 'First shop purchase',
		ach_secret: 'Secret found',
		ach_secret_d: 'Bought the secret theme',
		showcase: 'Showcase',
		quote: 'Quote of the day',
		games: 'Games',
catalog: 'Browse',
		catalogSub: 'Mods, modpacks, resource packs and shaders from Modrinth · installed via Theseus',
		mods: 'Mods',
		modpacks: 'Modpacks',
		resourcepacks: 'Resource packs',
		shaders: 'Shaders',
		datapacks: 'Data packs',
		searchShort: 'Search…',
		byRelevance: 'Relevance',
		byDownloads: 'Downloads',
		byFollows: 'Follows',
		byNewest: 'Newest',
		byUpdated: 'Updated',
		compatibleOnly: 'Compatible only',
		install: 'Install',
		installed: 'Installed',
		accountsSub: 'Sign-in via Theseus (Microsoft). The launcher never stores passwords.',
		addAccount: 'Add account',
		waitingLogin: 'Waiting for login window…',
		active: 'Active',
		makeDefault: 'Set as default',
		notSignedIn: 'Not signed in',
		notSignedInHint: 'Click “Add account”, sign in with Microsoft — then you can launch instances.',
		loggedInAs: 'Signed in as',
		loginError: 'Login error',
		themesSub: 'themes · colors, fonts, background, shapes, effects',
		builtinDark: 'Built-in · dark',
		builtinLight: 'Built-in · light',
		customDark: 'Custom · dark',
		customLight: 'Custom · light',
		copy: 'Copy',
		editTheme: 'Edit',
		import: 'Import',
		createTheme: 'Create theme',
		themeCopied: 'Theme copy created for editing',
		librarySub: 'instances from your Modrinth folder · launch without the original window',
		delete: 'Delete',
		rename: 'Rename',
		duplicate: 'Duplicate',
		repair: 'Repair',
		openFolder: 'Open folder',
		confirmDelete: 'Delete for real?',
		addFile: 'Add file',
		updateAll: 'Update all',
		findInCatalog: 'Find in catalog',
		files: 'files',
		contentHint: 'enable, disable, update and remove',
		mb: 'MB',
		kb: 'KB',
		coreStarting: 'Starting core…',
		coreFailed: 'Failed to start Theseus core',
		coreFailedHint: 'Close the original Modrinth App if it is running, then restart the launcher.',
		installingN: 'Installing',
		achUnlocked: 'Achievement unlocked',
		searchFailed: 'Search failed',
		selectInstance: 'Select instance',
		cancel: 'Cancel',
		myTheme: 'My theme',
	},
}

export function t(key: string): string {
	return dict[lang.value][key] ?? dict.ru[key] ?? key
}

// ─── Streamer mode ─────────────────────────────────────────────────────────
export interface StreamerSettings {
	enabled: boolean
	hideNickname: boolean
	hideToasts: boolean
	compactWindow: boolean
	blurAvatars: boolean
	hideAccountDetails: boolean
	hidePlaytime: boolean
	hideHistory: boolean
}

const STREAMER_KEY = 'nova.streamer'
export const streamer = ref<StreamerSettings>(
	read<StreamerSettings>(STREAMER_KEY, {
		enabled: false,
		hideNickname: true,
		hideToasts: true,
		compactWindow: true,
		blurAvatars: true,
		hideAccountDetails: true,
		hidePlaytime: false,
		hideHistory: false,
	}),
)
watch(streamer, (v) => write(STREAMER_KEY, v), { deep: true })

export function toggleStreamer() {
	streamer.value.enabled = !streamer.value.enabled
}
export const streamerActive = computed(() => streamer.value.enabled)

export function displayName(name?: string | null): string {
	if (!name) return lang.value === 'en' ? 'Player' : 'Игрок'
	if (streamer.value.enabled && streamer.value.hideNickname) return t('streamer')
	return name
}

// ─── Live backgrounds ──────────────────────────────────────────────────────
export type LiveBgKind = 'none' | 'particles' | 'stars' | 'aurora' | 'waves' | 'image'

export interface LiveBgSettings {
	enabled: boolean
	kind: LiveBgKind
	intensity: number
	speed: number
	/** custom image URL (http/data) used when kind === 'image' */
	customImage: string
	/** dim overlay 0..1 */
	dim: number
}

const LIVE_KEY = 'nova.livebg'
export const liveBg = ref<LiveBgSettings>(
	read<LiveBgSettings>(LIVE_KEY, {
		enabled: true,
		kind: 'particles',
		intensity: 0.85,
		speed: 1,
		customImage: '',
		dim: 0.35,
	}),
)
watch(liveBg, (v) => write(LIVE_KEY, v), { deep: true })

/** Built-in image presets (CSS gradients / subtle patterns as data-free choices) */
export const BG_IMAGE_PRESETS: { id: string; label: string; url: string }[] = [
	{
		id: 'nebula',
		label: 'Nebula',
		url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1600&q=80',
	},
	{
		id: 'mountains',
		label: 'Mountains',
		url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80',
	},
	{
		id: 'city',
		label: 'Night city',
		url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&q=80',
	},
	{
		id: 'forest',
		label: 'Forest',
		url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80',
	},
]

// ─── Auto theme ────────────────────────────────────────────────────────────
export interface AutoThemeSettings {
	enabled: boolean
	morning: string
	day: string
	evening: string
	night: string
}
const AUTO_KEY = 'nova.autotheme'
export const autoTheme = ref<AutoThemeSettings>(
	read<AutoThemeSettings>(AUTO_KEY, {
		enabled: false,
		morning: 'aurora',
		day: 'solar-light',
		evening: 'sunset-synth',
		night: 'midnight-neon',
	}),
)
watch(autoTheme, (v) => write(AUTO_KEY, v), { deep: true })

export type DayPart = 'morning' | 'day' | 'evening' | 'night'
export function currentDayPart(date = new Date()): DayPart {
	const h = date.getHours()
	if (h >= 6 && h < 11) return 'morning'
	if (h >= 11 && h < 17) return 'day'
	if (h >= 17 && h < 22) return 'evening'
	return 'night'
}
export function themeIdForNow(): string {
	return autoTheme.value[currentDayPart()]
}

// ─── Groups + colors ───────────────────────────────────────────────────────
export interface Group {
	id: string
	name: string
	color: string
}
const GROUPS_KEY = 'nova.groups'
const INST_GROUP_KEY = 'nova.instanceGroups'
const INST_COLOR_KEY = 'nova.instanceColors'

export const groups = ref<Group[]>(
	read<Group[]>(GROUPS_KEY, [
		{ id: 'g-pvp', name: 'PvP', color: '#ef4444' },
		{ id: 'g-modpacks', name: 'Модпаки', color: '#a855f7' },
		{ id: 'g-vanilla', name: 'Ванилла', color: '#22c55e' },
		{ id: 'g-tech', name: 'Техно', color: '#3b82f6' },
	]),
)
export const instanceGroup = ref<Record<string, string>>(read(INST_GROUP_KEY, {}))
export const instanceColor = ref<Record<string, string>>(read(INST_COLOR_KEY, {}))
watch(groups, (v) => write(GROUPS_KEY, v), { deep: true })
watch(instanceGroup, (v) => write(INST_GROUP_KEY, v), { deep: true })
watch(instanceColor, (v) => write(INST_COLOR_KEY, v), { deep: true })

export function groupOf(instanceId: string): Group | null {
	const gid = instanceGroup.value[instanceId]
	if (!gid) return null
	return groups.value.find((g) => g.id === gid) ?? null
}
export function setInstanceGroup(instanceId: string, groupId: string | null) {
	if (!groupId) {
		const next = { ...instanceGroup.value }
		delete next[instanceId]
		instanceGroup.value = next
	} else {
		instanceGroup.value = { ...instanceGroup.value, [instanceId]: groupId }
	}
}
export function setInstanceColor(instanceId: string, color: string | null) {
	if (!color) {
		const next = { ...instanceColor.value }
		delete next[instanceId]
		instanceColor.value = next
	} else {
		instanceColor.value = { ...instanceColor.value, [instanceId]: color }
	}
}
export function addGroup(name: string, color: string) {
	const id = 'g-' + Math.random().toString(36).slice(2, 8)
	groups.value = [...groups.value, { id, name, color }]
	return id
}
export function removeGroup(id: string) {
	groups.value = groups.value.filter((g) => g.id !== id)
	const next = { ...instanceGroup.value }
	for (const [k, v] of Object.entries(next)) if (v === id) delete next[k]
	instanceGroup.value = next
}
export const COLOR_PRESETS = [
	'#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
	'#3b82f6', '#8b5cf6', '#ec4899', '#a855f7', '#64748b',
]

// ─── Launch animation ──────────────────────────────────────────────────────
export const launchAnim = ref<{ active: boolean; instanceName: string; iconUrl: string | null }>({
	active: false,
	instanceName: '',
	iconUrl: null,
})
export function startLaunchAnim(name: string, iconUrl: string | null) {
	launchAnim.value = { active: true, instanceName: name, iconUrl }
}
export function endLaunchAnim() {
	launchAnim.value = { active: false, instanceName: '', iconUrl: null }
}

// ─── Launch history ────────────────────────────────────────────────────────
export interface HistoryEntry {
	instanceId: string
	name: string
	iconPath?: string | null
	at: number // unix ms
	/** session length in seconds if known */
	durationSec?: number
}
const HIST_KEY = 'nova.history'
const HIST_MAX = 50
export const launchHistory = ref<HistoryEntry[]>(read<HistoryEntry[]>(HIST_KEY, []))
watch(launchHistory, (v) => write(HIST_KEY, v), { deep: true })

export function recordLaunch(inst: Instance) {
	const entry: HistoryEntry = {
		instanceId: inst.id,
		name: inst.name,
		iconPath: inst.icon_path,
		at: Date.now(),
	}
	launchHistory.value = [entry, ...launchHistory.value.filter((h) => h.instanceId !== inst.id || Date.now() - h.at > 60_000)].slice(
		0,
		HIST_MAX,
	)
}

export function clearHistory() {
	launchHistory.value = []
}

export function formatAgo(ms: number): string {
	const s = (Date.now() - ms) / 1000
	if (s < 60) return lang.value === 'en' ? 'just now' : 'только что'
	if (s < 3600) return `${Math.floor(s / 60)} ${lang.value === 'en' ? 'min' : 'мин'} ${t('ago')}`
	if (s < 86400) return `${Math.floor(s / 3600)} ${lang.value === 'en' ? 'h' : 'ч'} ${t('ago')}`
	return `${Math.floor(s / 86400)} ${lang.value === 'en' ? 'd' : 'дн'} ${t('ago')}`
}

// ─── Random modpack ────────────────────────────────────────────────────────
export const randomBusy = ref(false)

export async function randomModpackPlay(
	trackJob: (j: api.InstallJob) => void,
	toast: (text: string, kind?: 'info' | 'error' | 'success', ms?: number) => void,
): Promise<void> {
	if (randomBusy.value) return
	randomBusy.value = true
	try {
		const offset = Math.floor(Math.random() * 80) * 5
		const res = await modrinth.search({
			query: '',
			kind: 'modpack',
			index: 'downloads',
			offset,
			limit: 20,
		})
		if (!res.hits.length) throw new Error('No modpacks found')
		const hit = res.hits[Math.floor(Math.random() * res.hits.length)]
		toast(`${t('randomModpack')}: «${hit.title}»…`, 'info', 5000)
		const versions = await modrinth.projectVersions(hit.project_id)
		if (!versions.length) throw new Error(`No versions for «${hit.title}»`)
		const ver = versions[0]
		const job = await api.createModpackInstance({
			project_id: hit.project_id,
			version_id: ver.id,
			title: hit.title,
			icon_url: hit.icon_url,
		})
		trackJob(job)
		toast(`OK: ${hit.title}`, 'success')
	} catch (e) {
		toast(`${t('randomModpack')}: ${api.errMsg(e)}`, 'error', 8000)
		throw e
	} finally {
		randomBusy.value = false
	}
}

export function randomLocalInstance(instances: Instance[], favorites: string[]): Instance | null {
	const ready = instances.filter(
		(i) => i.install_stage === 'installed' || i.install_stage === 'pack_installed',
	)
	if (!ready.length) return null
	const favs = ready.filter((i) => favorites.includes(i.id))
	const pool = favs.length ? favs : ready
	return pool[Math.floor(Math.random() * pool.length)]
}


// ─── UI sounds ─────────────────────────────────────────────────────────────
export interface SoundSettings {
	enabled: boolean
	volume: number // 0..1
	click: boolean
	launch: boolean
}
const SOUND_KEY = 'nova.sounds'
export const sounds = ref<SoundSettings>(
	read<SoundSettings>(SOUND_KEY, { enabled: true, volume: 0.35, click: true, launch: true }),
)
watch(sounds, (v) => write(SOUND_KEY, v), { deep: true })

let audioCtx: AudioContext | null = null
function ctx(): AudioContext | null {
	try {
		if (!audioCtx) audioCtx = new AudioContext()
		return audioCtx
	} catch {
		return null
	}
}
function beep(freq: number, dur: number, type: OscillatorType = 'sine', volMul = 1) {
	if (!sounds.value.enabled) return
	const c = ctx()
	if (!c) return
	const o = c.createOscillator()
	const g = c.createGain()
	o.type = type
	o.frequency.value = freq
	g.gain.value = sounds.value.volume * volMul
	o.connect(g)
	g.connect(c.destination)
	const t0 = c.currentTime
	g.gain.setValueAtTime(sounds.value.volume * volMul, t0)
	g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
	o.start(t0)
	o.stop(t0 + dur + 0.02)
}
export function playClick() {
	if (!sounds.value.click) return
	beep(520, 0.04, 'triangle', 0.7)
}
export function playLaunchSound() {
	if (!sounds.value.launch) return
	beep(220, 0.12, 'sine', 0.9)
	setTimeout(() => beep(330, 0.14, 'sine', 0.7), 90)
	setTimeout(() => beep(440, 0.18, 'sine', 0.5), 180)
}

// ─── Seasonal themes ───────────────────────────────────────────────────────
export interface SeasonalSettings {
	enabled: boolean
	halloween: string // theme id
	newyear: string
	summer: string
}
const SEASON_KEY = 'nova.seasonal'
export const seasonal = ref<SeasonalSettings>(
	read<SeasonalSettings>(SEASON_KEY, {
		enabled: false,
		halloween: 'obsidian-gold',
		newyear: 'nord-frost',
		summer: 'solar-light',
	}),
)
watch(seasonal, (v) => write(SEASON_KEY, v), { deep: true })

export type Season = 'halloween' | 'newyear' | 'summer' | null
export function currentSeason(date = new Date()): Season {
	const m = date.getMonth() + 1
	const d = date.getDate()
	// Halloween: Oct 20 – Nov 2
	if ((m === 10 && d >= 20) || (m === 11 && d <= 2)) return 'halloween'
	// New Year: Dec 20 – Jan 10
	if ((m === 12 && d >= 20) || (m === 1 && d <= 10)) return 'newyear'
	// Summer: Jun 1 – Aug 31
	if (m >= 6 && m <= 8) return 'summer'
	return null
}
export function seasonalThemeId(): string | null {
	if (!seasonal.value.enabled) return null
	const s = currentSeason()
	if (!s) return null
	return seasonal.value[s]
}

// ─── Epic-style hide launcher while playing ────────────────────────────────
export interface EpicHideSettings {
	/** hide window when game starts, show when game exits */
	enabled: boolean
}
const EPIC_KEY = 'nova.epicHide'
export const epicHide = ref<EpicHideSettings>(read(EPIC_KEY, { enabled: true }))
watch(epicHide, (v) => write(EPIC_KEY, v), { deep: true })


// ─── Mini mode (widget) ────────────────────────────────────────────────────
export interface MiniModeSettings {
	enabled: boolean
	/** only favorites in mini, else recent/all ready */
	favoritesOnly: boolean
}
const MINI_KEY = 'nova.mini'
export const miniMode = ref<MiniModeSettings>(read(MINI_KEY, { enabled: false, favoritesOnly: true }))
watch(miniMode, (v) => write(MINI_KEY, v), { deep: true })

export async function applyMiniWindowSize(on: boolean) {
	try {
		const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
		const win = getCurrentWindow()
		if (on) {
			await win.setSize(new LogicalSize(340, 520))
			await win.setMinSize(new LogicalSize(300, 400))
		} else {
			await win.setMinSize(new LogicalSize(900, 600))
			await win.setSize(new LogicalSize(1280, 800))
		}
	} catch {
		/* browser preview */
	}
}

// ─── Discord Rich Presence (best-effort) ───────────────────────────────────
export interface DiscordSettings {
	enabled: boolean
}
const DISCORD_KEY = 'nova.discord'
export const discordRpc = ref<DiscordSettings>(read(DISCORD_KEY, { enabled: true }))
watch(discordRpc, (v) => write(DISCORD_KEY, v), { deep: true })
