<script setup lang="ts">
import { computed, ref } from 'vue'

import Icon from '../components/Icon.vue'
import { t as tr } from '../core/features'
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
import { applyTheme } from '../themes/engine'
import { type ButtonStyle, type CardStyle, FONT_PRESETS, type HoverFx, type Theme } from '../themes/types'

function themeMeta(th: { builtin?: boolean; mode: string }) {
	if (th.builtin) return th.mode === 'dark' ? tr('builtinDark') : tr('builtinLight')
	return th.mode === 'dark' ? tr('customDark') : tr('customLight')
}

const editing = ref<Theme | null>(null)
const importText = ref('')
const showImport = ref(false)
const exportText = ref('')

const colorKeys: { key: keyof Theme['colors']; label: string; solid?: boolean }[] = [
	{ key: 'bg', label: 'Фон', solid: true },
	{ key: 'bg2', label: 'Фон 2', solid: true },
	{ key: 'surface', label: 'Карточки' },
	{ key: 'surface2', label: 'Карточки 2' },
	{ key: 'border', label: 'Границы' },
	{ key: 'text', label: 'Текст', solid: true },
	{ key: 'textDim', label: 'Второстепенный текст', solid: true },
	{ key: 'accent', label: 'Акцент', solid: true },
	{ key: 'accent2', label: 'Акцент 2', solid: true },
	{ key: 'accentText', label: 'Текст на акценте', solid: true },
	{ key: 'danger', label: 'Опасность', solid: true },
	{ key: 'success', label: 'Успех', solid: true },
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
		() => toast('JSON темы скопирован в буфер обмена', 'success'),
		() => toast('Скопируйте JSON из поля ниже', 'info'),
	)
}
function doImport() {
	try {
		const th = parseThemeJson(importText.value)
		saveCustomTheme(th)
		setActiveTheme(th.id)
		importText.value = ''
		showImport.value = false
		toast(`Тема «${th.name}» импортирована`, 'success')
	} catch (e) {
		toast(`Ошибка импорта: ${e instanceof Error ? e.message : e}`, 'error')
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
	if (f.size > 4 * 1024 * 1024) return toast('Картинка слишком большая (лимит 4 МБ)', 'error')
	const r = new FileReader()
	r.onload = () => {
		editing.value!.background.image = `url("${r.result}")`
		touch()
	}
	r.readAsDataURL(f)
}
function touch() {
	// реактивность темы отслеживается deep-watch; для встроенных активных — принудительное применение
	if (editing.value) applyTheme(editing.value, false)
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
			<h3>Editor</h3>
			<div class="row">
				<span v-if="activeIsEditing" class="badge ok">Live</span>
				<button class="btn ghost" @click="editing = null"><Icon name="check" />OK</button>
			</div>
		</div>

		<div class="egrid">
			<label class="field">Name<input v-model="editing.name" class="input" /></label>
			<label class="field">Author<input v-model="editing.author" class="input" /></label>
			<label class="field">Режим
				<select v-model="editing.mode" class="select"><option value="dark">Тёмная</option><option value="light">Светлая</option></select>
			</label>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">Цвета</h3>
			<div class="egrid">
				<div v-for="c in colorKeys" :key="c.key" class="cfield">
					<span>{{ c.label }}</span>
					<div class="cp">
						<input type="color" :value="hex6(editing.colors[c.key])" @input="editing.colors[c.key] = ($event.target as HTMLInputElement).value" />
						<input v-model="editing.colors[c.key]" class="input hex" spellcheck="false" />
					</div>
				</div>
			</div>
			<p class="muted" style="font-size: 12px">В текстовых полях можно писать любые CSS-цвета, в том числе <code>rgba(…)</code> для прозрачности.</p>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">Шрифты</h3>
			<div class="egrid">
				<label class="field">Основной
					<select v-model="editing.fonts.body" class="select"><option v-for="f in FONT_PRESETS" :key="f.label" :value="f.value">{{ f.label }}</option></select>
					<input v-model="editing.fonts.body" class="input mono" />
				</label>
				<label class="field">Заголовки
					<select v-model="editing.fonts.heading" class="select"><option v-for="f in FONT_PRESETS" :key="f.label" :value="f.value">{{ f.label }}</option></select>
					<input v-model="editing.fonts.heading" class="input mono" />
				</label>
				<label class="field">Моноширинный<input v-model="editing.fonts.mono" class="input mono" /></label>
			</div>
			<p class="muted" style="font-size: 12px">Можно указать любой установленный в системе шрифт, например <code>'Bahnschrift', sans-serif</code>.</p>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">Форма и стиль</h3>
			<div class="egrid">
				<label class="field">Скругление: {{ editing.shape.radius }}px<input v-model.number="editing.shape.radius" type="range" min="0" max="32" /></label>
				<label class="field">Стиль карточек
					<select v-model="editing.shape.cardStyle" class="select"><option v-for="c in cardStyles" :key="c" :value="c">{{ c }}</option></select>
				</label>
				<label class="field">Стиль кнопок
					<select v-model="editing.shape.buttonStyle" class="select"><option v-for="c in buttonStyles" :key="c" :value="c">{{ c }}</option></select>
				</label>
				<label class="field">Эффект при наведении
					<select v-model="editing.effects.hover" class="select"><option v-for="c in hovers" :key="c" :value="c">{{ c }}</option></select>
				</label>
			</div>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">Эффекты и анимации</h3>
			<div class="egrid">
				<label class="field">Скорость анимаций: {{ editing.effects.speed }} мс<input v-model.number="editing.effects.speed" type="range" min="0" max="700" step="10" /></label>
				<label class="field">Размытие стекла: {{ editing.effects.blur }}px<input v-model.number="editing.effects.blur" type="range" min="0" max="40" /></label>
				<label class="field">Свечение: {{ editing.effects.glow.toFixed(2) }}<input v-model.number="editing.effects.glow" type="range" min="0" max="1" step="0.05" /></label>
				<label class="field">Зернистость: {{ editing.effects.grain.toFixed(2) }}<input v-model.number="editing.effects.grain" type="range" min="0" max="0.3" step="0.01" /></label>
			</div>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">Фон</h3>
			<div class="egrid">
				<label class="field" style="grid-column: 1 / -1">CSS background-image (градиент или url)
					<input v-model="editing.background.image" class="input mono" placeholder="linear-gradient(135deg, #123, #456)" />
				</label>
				<label class="field">Размытие фона: {{ editing.background.blur }}px<input v-model.number="editing.background.blur" type="range" min="0" max="30" /></label>
				<label class="field">Затемнение: {{ editing.background.dim.toFixed(2) }}<input v-model.number="editing.background.dim" type="range" min="0" max="0.9" step="0.05" /></label>
				<div class="field">Своё изображение
					<label class="btn ghost" style="cursor: pointer"><Icon name="upload" />Выбрать картинку
						<input type="file" accept="image/*" hidden @change="pickBgImage" />
					</label>
				</div>
			</div>
		</div>

		<div>
			<h3 style="margin-bottom: 10px">Свой CSS (полный контроль)</h3>
			<textarea v-model="editing.customCss" class="textarea" spellcheck="false" placeholder=".card { outline: 1px dashed var(--accent); }"></textarea>
			<p class="muted" style="font-size: 12px">
				Доступны переменные <code>--accent</code>, <code>--surface</code>, <code>--radius</code> и др., классы <code>.card</code>, <code>.btn</code>, <code>.nav</code>, <code>.inst</code>, <code>.titlebar</code>.
			</p>
		</div>
	</section>
</template>
