<script setup lang="ts">
import { computed, ref } from 'vue'

import Icon from '../components/Icon.vue'
import {
	BUILTIN_ICON_NAMES,
	NAV_ICON_SLOTS,
	fileToDataUrl,
	getSlotIcon,
	iconPack,
	resetIconPack,
	setSlotIcon,
	type NavIconSlot,
} from '../core/iconPack'
import { t as tr } from '../core/features'
import { lang } from '../core/features'
import { toast } from '../core/store'
import {
	activeThemeId,
	allThemes,
	cloneTheme,
	deleteCustomTheme,
	parseThemeJson,
	saveCustomTheme,
	setActiveTheme,
} from '../themes/engine'
import { applyTheme, scheduleApplyTheme } from '../themes/engine'
import { type ButtonStyle, type CardStyle, FONT_PRESETS, type HoverFx, type Theme } from '../themes/types'

function themeMeta(th: { builtin?: boolean; mode: string }) {
	if (th.builtin) return th.mode === 'dark' ? tr('builtinDark') : tr('builtinLight')
	return th.mode === 'dark' ? tr('customDark') : tr('customLight')
}

/** hub: folders | themes | icons */
const folder = ref<'hub' | 'themes' | 'icons'>('hub')
const iconEditSlot = ref<NavIconSlot | null>(null)
const emojiDraft = ref('🎮')

const editing = ref<Theme | null>(null)
const importText = ref('')
const showImport = ref(false)
const exportText = ref('')

const colorKeys: { key: keyof Theme['colors']; labelKey: string; solid?: boolean }[] = [
	{ key: 'bg', labelKey: 'thC_bg', solid: true },
	{ key: 'bg2', labelKey: 'thC_bg2', solid: true },
	{ key: 'surface', labelKey: 'thC_surface' },
	{ key: 'surface2', labelKey: 'thC_surface2' },
	{ key: 'border', labelKey: 'thC_border' },
	{ key: 'text', labelKey: 'thC_text', solid: true },
	{ key: 'textDim', labelKey: 'thC_textDim', solid: true },
	{ key: 'accent', labelKey: 'thC_accent', solid: true },
	{ key: 'accent2', labelKey: 'thC_accent2', solid: true },
	{ key: 'accentText', labelKey: 'thC_accentText', solid: true },
	{ key: 'danger', labelKey: 'thC_danger', solid: true },
	{ key: 'success', labelKey: 'thC_success', solid: true },
]

const cardStyles: CardStyle[] = ['glass', 'flat', 'outlined', 'raised']
const buttonStyles: ButtonStyle[] = ['solid', 'pill', 'outline', 'soft', 'sharp']
const hovers: HoverFx[] = ['lift', 'glow', 'none']

const activeIsEditing = computed(() => editing.value && editing.value.id === activeThemeId.value)

/** <input type=color> принимает только #rrggbb — для rgba показываем приближение */
function hex6(v: string): string {
	if (/^#[0-9a-f]{6}$/i.test(v)) return v
	if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('')
	const m = v.match(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/i)
	if (m) return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('')
	return '#000000'
}


function openFolder(f: 'themes' | 'icons') {
	folder.value = f
}
function backHub() {
	folder.value = 'hub'
	editing.value = null
	iconEditSlot.value = null
}
function pickBuiltin(slot: NavIconSlot, name: string) {
	setSlotIcon(slot, { type: 'builtin', name })
}
async function pickIconFile(slot: NavIconSlot, e: Event) {
	const f = (e.target as HTMLInputElement).files?.[0]
	if (!f) return
	if (f.size > 400_000) {
		toast(lang.value === 'en' ? 'Image too large (max ~400KB)' : 'Картинка слишком большая (макс. ~400 КБ)', 'error')
		;(e.target as HTMLInputElement).value = ''
		return
	}
	try {
		const dataUrl = await fileToDataUrl(f)
		setSlotIcon(slot, { type: 'image', dataUrl })
	} catch {
		toast('Upload failed', 'error')
	}
	;(e.target as HTMLInputElement).value = ''
}
function applyEmoji(slot: NavIconSlot) {
	const em = emojiDraft.value.trim().slice(0, 4)
	if (!em) return
	setSlotIcon(slot, { type: 'emoji', emoji: em })
}

function choose(t: Theme) {
	setActiveTheme(t.id)
}
function startEdit(t: Theme) {
	// встроенные темы не меняем — работаем с копией
	if (t.builtin) {
		const c = cloneTheme(t)
		saveCustomTheme(c)
		setActiveTheme(c.id)
		editing.value = c
		toast(tr('themeCopied'), 'info')
	} else {
		editing.value = t
		setActiveTheme(t.id)
	}
}
function newTheme() {
	const base = allThemes.value.find((x) => x.id === activeThemeId.value) ?? allThemes.value[0]
	const c = cloneTheme(base, tr('myTheme'))
	saveCustomTheme(c)
	setActiveTheme(c.id)
	editing.value = c
}
function remove(t: Theme) {
	deleteCustomTheme(t.id)
	if (editing.value?.id === t.id) editing.value = null
}
function exportTheme(t: Theme) {
	const { builtin, id, ...rest } = t
	void builtin
	void id
	exportText.value = JSON.stringify(rest, null, 2)
	navigator.clipboard?.writeText(exportText.value).then(
		() => toast(tr('thJsonCopied'), 'success'),
		() => toast(tr('thJsonCopyManual'), 'info'),
	)
}
function doImport() {
	try {
		const th = parseThemeJson(importText.value)
		saveCustomTheme(th)
		setActiveTheme(th.id)
		importText.value = ''
		showImport.value = false
		toast(`${tr('thImported')}: ${th.name}`, 'success')
	} catch (e) {
		toast(`${tr('thImportError')}: ${e instanceof Error ? e.message : e}`, 'error')
	}
}
async function onFile(e: Event) {
	const f = (e.target as HTMLInputElement).files?.[0]
	if (!f) return
	importText.value = await f.text()
	doImport()
	;(e.target as HTMLInputElement).value = ''
}
function pickBgImage(e: Event) {
	const f = (e.target as HTMLInputElement).files?.[0]
	if (!f || !editing.value) return
	if (f.size > 4 * 1024 * 1024) return toast(tr('thImgTooBig'), 'error')
	const r = new FileReader()
	r.onload = () => {
		editing.value!.background.image = `url("${r.result}")`
		touch()
	}
	r.readAsDataURL(f)
}
function touch() {
	// реактивность темы отслеживается deep-watch; для встроенных активных — принудительное применение
	if (editing.value) scheduleApplyTheme(editing.value)
}
function previewBg(t: Theme) {
	return {
		background: `${t.background.image && t.background.image !== 'none' ? t.background.image + ',' : ''}linear-gradient(160deg,${t.colors.bg},${t.colors.bg2})`,
		backgroundSize: 'cover',
		fontFamily: t.fonts.body,
		color: t.colors.text,
	}
}
function cardPrev(t: Theme) {
	const r = t.shape.radius
	return { background: t.colors.surface, border: `1px solid ${t.colors.border}`, borderRadius: r / 2 + 'px' }
}
</script>

<template>
	<!-- ===== HUB: folders ===== -->
	<div v-if="folder === 'hub'" class="page">
		<div class="page-head">
			<div>
				<h1>{{ tr('themes') }}</h1>
				<p>{{ tr('themeFolder') }}</p>
			</div>
		</div>
		<div class="folder-grid">
			<button class="card folder-card hoverable" @click="openFolder('themes')">
				<div class="folder-ico"><Icon name="palette" /></div>
				<div>
					<b>{{ tr('themeFolderThemes') }}</b>
					<div class="muted" style="font-size: 12px; margin-top: 4px">{{ tr('themeFolderThemesD') }}</div>
				</div>
			</button>
			<button class="card folder-card hoverable" @click="openFolder('icons')">
				<div class="folder-ico"><Icon name="grid" /></div>
				<div>
					<b>{{ tr('themeFolderIcons') }}</b>
					<div class="muted" style="font-size: 12px; margin-top: 4px">{{ tr('themeFolderIconsD') }}</div>
				</div>
			</button>
			<div class="card folder-card dim">
				<div class="folder-ico"><Icon name="folder" /></div>
				<div>
					<b>{{ tr('themeFolderMore') }}</b>
					<div class="muted" style="font-size: 12px; margin-top: 4px">{{ tr('themeFolderMoreD') }}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- ===== ICONS ===== -->
	<div v-else-if="folder === 'icons'" class="page">
		<div class="page-head">
			<div>
				<button class="btn ghost" style="margin-bottom: 8px" @click="backHub"><Icon name="back" />{{ tr('backFolders') }}</button>
				<h1>{{ tr('iconsTitle') }}</h1>
				<p>{{ tr('iconsSub') }}</p>
			</div>
			<button class="btn ghost" @click="resetIconPack(); toast(tr('iconsReset'), 'info')">{{ tr('iconsReset') }}</button>
		</div>
		<div class="icon-slots">
			<article v-for="s in NAV_ICON_SLOTS" :key="s.id" class="card icon-slot">
				<div class="row" style="gap: 12px; align-items: center">
					<div class="preview-ico">
						<Icon :name="s.defaultIcon" :custom="getSlotIcon(s.id, s.defaultIcon)" />
					</div>
					<div class="grow">
						<b>{{ tr(s.labelKey) }}</b>
						<div class="muted" style="font-size: 11px">{{ s.id }}</div>
					</div>
					<button class="btn ghost" @click="iconEditSlot = iconEditSlot === s.id ? null : s.id">
						{{ iconEditSlot === s.id ? 'OK' : tr('edit') }}
					</button>
				</div>
				<div v-if="iconEditSlot === s.id" class="icon-edit">
					<div class="muted" style="font-size: 12px; margin-bottom: 6px">{{ tr('iconsBuiltin') }}</div>
					<div class="builtin-grid">
						<button
							v-for="n in BUILTIN_ICON_NAMES"
							:key="n"
							class="ico-pick"
							:class="{ on: getSlotIcon(s.id, s.defaultIcon).type === 'builtin' && (getSlotIcon(s.id, s.defaultIcon) as any).name === n }"
							:title="n"
							@click="pickBuiltin(s.id, n)"
						>
							<Icon :name="n" />
						</button>
					</div>
					<div class="row" style="gap: 8px; margin-top: 10px; flex-wrap: wrap; align-items: center">
						<label class="btn ghost" style="cursor: pointer">
							<Icon name="upload" />{{ tr('iconsUpload') }}
							<input type="file" accept="image/*" hidden @change="pickIconFile(s.id, $event)" />
						</label>
						<input v-model="emojiDraft" class="input" style="width: 72px; text-align: center" maxlength="4" />
						<button class="btn ghost" @click="applyEmoji(s.id)">{{ tr('iconsEmoji') }}</button>
						<button class="btn ghost" @click="setSlotIcon(s.id, null)">{{ tr('iconsResetOne') }}</button>
					</div>
				</div>
			</article>
		</div>
	</div>

	<!-- ===== THEMES (existing) ===== -->
	<div v-else class="page themes-folder">
		<button class="btn ghost" style="margin-bottom: 10px" @click="backHub"><Icon name="back" />{{ tr('backFolders') }}</button>

	<div class="page-head">
		<div>
			<h1>{{ tr('themes') }}</h1>
			<p>{{ allThemes.length }} {{ tr('themesSub') }}</p>
		</div>
		<div class="row">
			<button class="btn ghost" @click="showImport = !showImport"><Icon name="upload" />{{ tr('import') }}</button>
			<button class="btn" @click="newTheme"><Icon name="plus" />{{ tr('createTheme') }}</button>
		</div>
	</div>

	<div v-if="showImport" class="card section" style="margin-bottom: 20px">
		<h3>{{ tr('import') }}</h3>
		<textarea v-model="importText" class="textarea" placeholder='Вставьте JSON темы: {"name":"…","colors":{…}}'></textarea>
		<div class="row">
			<button class="btn" :disabled="!importText.trim()" @click="doImport">{{ tr('import') }}</button>
			<label class="btn ghost" style="cursor: pointer">
				<Icon name="folder" />JSON
				<input type="file" accept=".json,application/json" hidden @change="onFile" />
			</label>
		</div>
	</div>

	<div class="themes-grid">
		<article v-for="t in allThemes" :key="t.id" class="card hoverable tcard" :class="{ active: t.id === activeThemeId }" @click="choose(t)">
			<div class="tprev" :style="previewBg(t)">
				<div class="l1" :style="{ background: t.colors.text }"></div>
				<div class="l2" :style="{ background: t.colors.textDim }"></div>
				<div style="display: flex; gap: 8px; margin-top: auto; align-items: flex-end">
					<div class="btnp" :style="{ background: t.colors.accent, borderRadius: t.shape.buttonStyle === 'pill' ? '99px' : t.shape.buttonStyle === 'sharp' ? '0' : '6px' }"></div>
					<div style="flex: 1; height: 38px" :style="cardPrev(t)"></div>
				</div>
			</div>
			<div class="tinfo">
				<div style="min-width: 0">
					<div style="font-weight: 700; font-family: var(--font-head)">{{ t.name }}</div>
					<div class="muted" style="font-size: 11px">{{ themeMeta(t) }}</div>
				</div>
				<div class="swatches">
					<i :style="{ background: t.colors.accent }"></i><i :style="{ background: t.colors.accent2 }"></i><i :style="{ background: t.colors.bg }"></i>
				</div>
			</div>
			<div class="row" style="padding: 0 12px 12px; gap: 6px" @click.stop>
				<button class="btn ghost" style="padding: 6px 10px; font-size: 12px" @click="startEdit(t)"><Icon name="edit" />{{ t.builtin ? tr('copy') : tr('editTheme') }}</button>
				<button class="iconbtn" title="Экспорт (копировать JSON)" @click="exportTheme(t)"><Icon name="copy" /></button>
				<button v-if="!t.builtin" class="iconbtn" title="Удалить" @click="remove(t)"><Icon name="trash" /></button>
			</div>
		</article>
	</div>

	<div v-if="exportText" class="card section" style="margin-top: 20px">
		<h3>Export</h3>
		<textarea :value="exportText" class="textarea" readonly style="min-height: 160px"></textarea>
		<div><button class="btn ghost" @click="exportText = ''">OK</button></div>
	</div>

	<!-- ===== редактор ===== -->
	<section v-if="editing" class="card editor">
		<div class="row between wrap">
			<h3>{{ tr('thEditor') }}</h3>
			<div class="row">
				<span v-if="activeIsEditing" class="badge ok">{{ tr('thLive') }}</span>
				<button class="btn ghost" @click="editing = null"><Icon name="check" />OK</button>
			</div>
		</div>

		<div class="egrid">
			<label class="field">{{ tr('thName') }}<input v-model="editing.name" class="input" /></label>
			<label class="field">{{ tr('thAuthor') }}<input v-model="editing.author" class="input" /></label>
			<label class="field">{{ tr('thMode') }}
				<select v-model="editing.mode" class="select"><option value="dark">{{ tr('thDark') }}</option><option value="light">{{ tr('thLight') }}</option></select>
			</label>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">{{ tr('thColors') }}</h3>
			<div class="egrid">
				<div v-for="c in colorKeys" :key="c.key" class="cfield">
					<span>{{ tr(c.labelKey) }}</span>
					<div class="cp">
						<input type="color" :value="hex6(editing.colors[c.key])" @input="editing.colors[c.key] = ($event.target as HTMLInputElement).value" />
						<input v-model="editing.colors[c.key]" class="input hex" spellcheck="false" />
					</div>
				</div>
			</div>
			<p class="muted" style="font-size: 12px">{{ tr('thColorHint') }}</p>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">{{ tr('thFonts') }}</h3>
			<div class="egrid">
				<label class="field">{{ tr('thFontBody') }}
					<select v-model="editing.fonts.body" class="select"><option v-for="f in FONT_PRESETS" :key="f.label" :value="f.value">{{ f.label }}</option></select>
					<input v-model="editing.fonts.body" class="input mono" />
				</label>
				<label class="field">{{ tr('thFontHead') }}
					<select v-model="editing.fonts.heading" class="select"><option v-for="f in FONT_PRESETS" :key="f.label" :value="f.value">{{ f.label }}</option></select>
					<input v-model="editing.fonts.heading" class="input mono" />
				</label>
				<label class="field">{{ tr('thFontMono') }}<input v-model="editing.fonts.mono" class="input mono" /></label>
			</div>
			<p class="muted" style="font-size: 12px">{{ tr('thFontHint') }}</p>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">{{ tr('thShape') }}</h3>
			<div class="egrid">
				<label class="field">{{ tr('thRadius') }}: {{ editing.shape.radius }}px<input v-model.number="editing.shape.radius" type="range" min="0" max="32" /></label>
				<label class="field">{{ tr('thCardStyle') }}
					<select v-model="editing.shape.cardStyle" class="select"><option v-for="c in cardStyles" :key="c" :value="c">{{ c }}</option></select>
				</label>
				<label class="field">{{ tr('thBtnStyle') }}
					<select v-model="editing.shape.buttonStyle" class="select"><option v-for="c in buttonStyles" :key="c" :value="c">{{ c }}</option></select>
				</label>
				<label class="field">{{ tr('thHover') }}
					<select v-model="editing.effects.hover" class="select"><option v-for="c in hovers" :key="c" :value="c">{{ c }}</option></select>
				</label>
			</div>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">{{ tr('thEffects') }}</h3>
			<div class="egrid">
				<label class="field">{{ tr('thAnimSpeed') }}: {{ editing.effects.speed }} ms<input v-model.number="editing.effects.speed" type="range" min="0" max="700" step="10" /></label>
				<label class="field">{{ tr('thGlassBlur') }}: {{ editing.effects.blur }}px<input v-model.number="editing.effects.blur" type="range" min="0" max="40" /></label>
				<label class="field">{{ tr('thGlow') }}: {{ editing.effects.glow.toFixed(2) }}<input v-model.number="editing.effects.glow" type="range" min="0" max="1" step="0.05" /></label>
				<label class="field">{{ tr('thGrain') }}: {{ editing.effects.grain.toFixed(2) }}<input v-model.number="editing.effects.grain" type="range" min="0" max="0.3" step="0.01" /></label>
			</div>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">{{ tr('thBg') }}</h3>
			<div class="egrid">
				<label class="field" style="grid-column: 1 / -1">{{ tr('thBgCss') }}
					<input v-model="editing.background.image" class="input mono" placeholder="linear-gradient(135deg, #123, #456)" />
				</label>
				<label class="field">{{ tr('thBgBlur') }}: {{ editing.background.blur }}px<input v-model.number="editing.background.blur" type="range" min="0" max="30" /></label>
				<label class="field">{{ tr('thBgDim') }}: {{ editing.background.dim.toFixed(2) }}<input v-model.number="editing.background.dim" type="range" min="0" max="0.9" step="0.05" /></label>
				<div class="field">{{ tr('thBgImage') }}
					<label class="btn ghost" style="cursor: pointer"><Icon name="upload" />{{ tr('thPickImage') }}
						<input type="file" accept="image/*" hidden @change="pickBgImage" />
					</label>
				</div>
			</div>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">{{ tr('thCustomCss') }}</h3>
			<textarea v-model="editing.customCss" class="textarea" spellcheck="false" placeholder=".card { outline: 1px dashed var(--accent); }"></textarea>
			<p class="muted" style="font-size: 12px">{{ tr('thCustomCssHint') }}</p>
		</div>
	</section>
	</div>
</template>

<style scoped>
.folder-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 14px;
}
.folder-card {
	display: flex;
	gap: 14px;
	align-items: center;
	padding: 18px;
	text-align: left;
	cursor: pointer;
	border: 1px solid transparent;
	background: var(--surface);
	color: var(--text);
}
.folder-card.hoverable:hover { border-color: var(--accent); }
.folder-card.dim { opacity: 0.55; cursor: default; }
.folder-ico {
	width: 48px; height: 48px; border-radius: 14px;
	display: grid; place-items: center;
	background: color-mix(in srgb, var(--accent) 18%, transparent);
	color: var(--accent);
	font-size: 22px;
}
.icon-slots { display: flex; flex-direction: column; gap: 10px; max-width: 720px; }
.icon-slot { padding: 14px 16px; }
.preview-ico {
	width: 40px; height: 40px; border-radius: 12px;
	display: grid; place-items: center;
	background: var(--surface-2);
	font-size: 20px;
}
.icon-edit { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border, rgba(255,255,255,.08)); }
.builtin-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
	gap: 6px;
}
.ico-pick {
	width: 36px; height: 36px; border-radius: 8px;
	display: grid; place-items: center;
	background: var(--surface-2);
	border: 1px solid transparent;
	color: var(--text);
	cursor: pointer;
	padding: 0;
}
.ico-pick.on, .ico-pick:hover { border-color: var(--accent); color: var(--accent); }
</style>
