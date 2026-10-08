<script setup lang="ts">
import { open } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { computed, onMounted, ref, watch } from 'vue'

import Icon from '../components/Icon.vue'
import * as api from '../core/api'
import {
	COLOR_PRESETS,
	groupOf,
	groups,
	instanceColor,
	setInstanceColor,
	setInstanceGroup,
	t,
} from '../core/features'
import { findConflicts } from '../core/conflicts'
import {
	go, instances, jobFor, launching, nav, openBrowse, play, refreshInstances, running, stop, toast, trackJob,
} from '../core/store'

const inst = computed(() => instances.value.find((i) => i.id === nav.instanceId) ?? null)
const items = ref<api.ContentItem[]>([])
const loading = ref(false)
const filter = ref<string>('all')
const q = ref('')
const renaming = ref(false)
const newName = ref('')
const confirmDelete = ref(false)
const busyPath = ref<Record<string, boolean>>({})

const isRunning = computed(() => !!inst.value && !!running[inst.value.id])
const isLaunching = computed(() => !!inst.value && !!launching[inst.value.id])
const job = computed(() => (inst.value ? jobFor(inst.value.id) : undefined))
const icon = computed(() => api.instanceIconUrl(inst.value?.icon_path))
const grp = computed(() => (inst.value ? groupOf(inst.value.id) : null))
const labelColor = computed(() =>
	inst.value ? instanceColor.value[inst.value.id] || grp.value?.color || null : null,
)
const conflicts = computed(() => findConflicts(items.value))
const exporting = ref(false)

const typeLabel = computed(() => ({
	mod: t('mods'),
	resourcepack: t('resourcepacks'),
	shaderpack: t('shaders'),
	datapack: t('datapacks'),
}))
function typeLabelOf(k: string) {
	return (typeLabel.value as Record<string, string>)[k] ?? k
}
const counts = computed(() => {
	const c: Record<string, number> = {}
	for (const i of items.value) c[i.project_type] = (c[i.project_type] ?? 0) + 1
	return c
})
const shown = computed(() => {
	const s = q.value.trim().toLowerCase()
	return items.value
		.filter((i) => (filter.value === 'all' || i.project_type === filter.value) &&
			(!s || (i.project?.title ?? i.file_name).toLowerCase().includes(s) || i.file_name.toLowerCase().includes(s)))
		.sort((a, b) => (a.project?.title ?? a.file_name).localeCompare(b.project?.title ?? b.file_name))
})
const updatable = computed(() => items.value.filter((i) => i.has_update))

async function load() {
	if (!inst.value) return
	loading.value = true
	try {
		items.value = await api.getContentItems(inst.value.id)
	} catch (e) {
		toast(`Не удалось получить список контента: ${api.errMsg(e)}`, 'error')
	} finally {
		loading.value = false
	}
}
onMounted(load)
watch(() => nav.instanceId, load)
watch(() => job.value?.status, (s, prev) => { if (prev && !s) load() })

async function withBusy(path: string, fn: () => Promise<unknown>, errPrefix: string) {
	busyPath.value[path] = true
	try {
		await fn()
		await load()
	} catch (e) {
		toast(`${errPrefix}: ${api.errMsg(e)}`, 'error', 7000)
	} finally {
		delete busyPath.value[path]
	}
}
const toggle = (i: api.ContentItem) =>
	withBusy(i.file_path, () => api.toggleContent(inst.value!.id, i.file_path, !i.enabled), 'Не удалось переключить')
const remove = (i: api.ContentItem) =>
	withBusy(i.file_path, () => api.removeContent(inst.value!.id, i.file_path), 'Не удалось удалить')
const update = (i: api.ContentItem) =>
	withBusy(i.file_path, () => api.updateProject(inst.value!.id, i.file_path), 'Не удалось обновить')

async function updateAll() {
	for (const i of updatable.value) await update(i)
	toast('Обновление завершено', 'success')
}

async function saveName() {
	if (!inst.value || !newName.value.trim()) return
	try {
		await api.renameInstance(inst.value.id, newName.value.trim())
		await refreshInstances()
		renaming.value = false
	} catch (e) {
		toast(`Не удалось переименовать: ${api.errMsg(e)}`, 'error')
	}
}
async function del() {
	if (!inst.value) return
	if (!confirmDelete.value) {
		confirmDelete.value = true
		setTimeout(() => (confirmDelete.value = false), 4000)
		return
	}
	try {
		await api.removeInstance(inst.value.id)
		await refreshInstances()
		toast('Сборка удалена', 'success')
		go('library')
	} catch (e) {
		toast(`Не удалось удалить: ${api.errMsg(e)}`, 'error')
	}
}
async function duplicate() {
	if (!inst.value) return
	try {
		trackJob(await api.duplicateInstance(inst.value.id))
		toast('Копия создаётся…', 'info')
	} catch (e) {
		toast(`Не удалось создать копию: ${api.errMsg(e)}`, 'error')
	}
}
async function repair() {
	if (!inst.value) return
	try {
		trackJob(await api.repairInstance(inst.value.id))
		toast('Переустановка файлов игры запущена…', 'info')
	} catch (e) {
		toast(`Не удалось запустить восстановление: ${api.errMsg(e)}`, 'error')
	}
}
async function openFolder() {
	if (!inst.value) return
	try {
		await revealItemInDir(await api.getInstancePath(inst.value.id))
	} catch (e) {
		toast(`Не удалось открыть папку: ${api.errMsg(e)}`, 'error')
	}
}
async function addFiles() {
	if (!inst.value) return
	try {
		const picked = await open({ multiple: true, filters: [{ name: 'Файлы контента', extensions: ['jar', 'zip', 'mrpack'] }] })
		if (!picked) return
		const list = Array.isArray(picked) ? picked : [picked]
		for (const p of list) {
			const path = typeof p === 'string' ? p : (p as { path: string }).path
			await api.addProjectFromPath(inst.value.id, path)
		}
		toast(`Добавлено файлов: ${list.length}`, 'success')
		await load()
	} catch (e) {
		toast(`Не удалось добавить файл: ${api.errMsg(e)}`, 'error')
	}
}


async function exportPack() {
	if (!inst.value || exporting.value) return
	exporting.value = true
	try {
		const { save } = await import('@tauri-apps/plugin-dialog')
		const dest = await save({
			defaultPath: `${inst.value.name.replace(/[^\w\- ]+/g, '_')}.mrpack`,
			filters: [{ name: 'Modrinth pack', extensions: ['mrpack'] }],
		})
		if (!dest) return
		const path = typeof dest === 'string' ? dest : (dest as { path: string }).path
		const candidates = await api.getPackExportCandidates(inst.value.id)
		await api.exportMrpack(inst.value.id, path, candidates)
		toast(langMsg('exported'), 'success')
	} catch (e) {
		toast(`Export .mrpack: ${api.errMsg(e)}`, 'error', 9000)
	} finally {
		exporting.value = false
	}
}
function langMsg(k: string) {
	try {
		const raw = localStorage.getItem('nova.lang')
		if (raw === 'en') return k === 'exported' ? 'Pack exported' : k
	} catch {}
	return k === 'exported' ? 'Сборка экспортирована в .mrpack' : k
}
function onGroupChange(e: Event) {
	const v = (e.target as HTMLSelectElement).value
	if (inst.value) setInstanceGroup(inst.value.id, v || null)
}
function size(n: number) {
	return n > 1e6 ? (n / 1e6).toFixed(1) + ' ' + t('mb') : Math.max(1, Math.round(n / 1e3)) + ' ' + t('kb')
}
</script>

<template>
	<template v-if="inst">
		<button class="btn ghost" style="margin-bottom: 16px" @click="go('library')"><Icon name="back" />{{ t('library') }}</button>

		<div class="card section inst-head">
			<div class="row" style="gap: 18px; align-items: center; flex-wrap: wrap">
				<div class="ico big">
					<img v-if="icon" :src="icon" alt="" />
					<template v-else>{{ inst.name.slice(0, 1).toUpperCase() }}</template>
				</div>
				<div class="grow" style="min-width: 220px">
					<div v-if="!renaming" class="row" style="gap: 10px">
						<h1 style="font-size: 24px">{{ inst.name }}</h1>
						<button class="iconbtn" :title="t('rename')" @click="renaming = true; newName = inst.name"><Icon name="edit" /></button>
					</div>
					<div v-else class="row">
						<input v-model="newName" class="input" style="max-width: 320px" @keyup.enter="saveName" />
						<button class="btn" @click="saveName"><Icon name="check" /></button>
						<button class="btn ghost" @click="renaming = false"><Icon name="close" /></button>
					</div>
					<div class="meta" style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap">
						<span class="badge">{{ inst.loader }}{{ inst.loader_version ? ' ' + inst.loader_version : '' }}</span>
						<span class="badge">Minecraft {{ inst.game_version }}</span>
						<span v-if="isRunning" class="badge run"><i class="pulse"></i>{{ t('running') }}</span>
						<span v-else-if="job" class="badge run"><i class="pulse"></i>Установка {{ job.progress && job.progress.total ? Math.round(job.progress.current / job.progress.total * 100) + '%' : '' }}</span>
						<span v-else-if="inst.install_stage === 'not_installed'" class="badge warn">Не установлена</span>
						<span v-else class="badge ok">Готова</span>
					</div>
				</div>
				<div class="row wrap">
					<button v-if="isRunning" class="btn danger" @click="stop(inst)"><Icon name="stop" />Стоп</button>
					<button v-else class="btn" :disabled="isLaunching || !!job" @click="play(inst)"><Icon name="play" />{{ isLaunching ? 'Запуск' : 'Играть' }}</button>
					<button class="iconbtn" title="Открыть папку" @click="openFolder"><Icon name="folder" /></button>
					<button class="iconbtn" title="Копировать сборку" @click="duplicate"><Icon name="copy" /></button>
					<button class="iconbtn" title="Переустановить файлы игры" @click="repair"><Icon name="refresh" /></button>
					<button class="btn ghost" :disabled="exporting" @click="exportPack"><Icon name="folder" />{{ exporting ? '…' : '.mrpack' }}</button>
					<button class="btn" :class="confirmDelete ? 'danger' : 'ghost'" @click="del"><Icon name="trash" />{{ confirmDelete ? t('confirmDelete') : t('delete') }}</button>
				</div>
			</div>
		</div>

		<div class="card section" style="margin-top: 16px">
			<h3 style="margin: 0 0 12px">{{ t('groupColor') }}</h3>
			<div class="row" style="gap: 10px; flex-wrap: wrap; align-items: center">
				<label class="field" style="margin: 0; min-width: 180px">
					{{ t('groups') }}
					<select
						class="select"
						:value="grp?.id ?? ''"
						@change="onGroupChange($event)"
					>
						<option value="">{{ t('noGroup') }}</option>
						<option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
					</select>
				</label>
				<div>
					<div class="muted" style="font-size: 12px; margin-bottom: 6px">{{ t('labelColor') }}</div>
					<div class="row" style="gap: 6px; flex-wrap: wrap">
						<button
							v-for="c in COLOR_PRESETS"
							:key="c"
							class="color-pick"
							:class="{ on: instanceColor[inst.id] === c }"
							:style="{ background: c }"
							@click="setInstanceColor(inst.id, c)"
						/>
						<button class="btn ghost" style="padding: 4px 10px; font-size: 12px" @click="setInstanceColor(inst.id, null)">{{ t('reset') }}</button>
					</div>
				</div>
				<span v-if="labelColor" class="badge" :style="{ borderColor: labelColor, color: labelColor }">
					{{ grp?.name || '•' }}
				</span>
			</div>
		</div>

		
		<div v-if="conflicts.length" class="card section" style="margin-top: 12px; border-color: var(--danger)">
			<h3 style="margin: 0 0 8px; color: var(--danger)">⚠ Конфликты модов ({{ conflicts.length }})</h3>
			<ul style="margin: 0; padding-left: 18px; font-size: 13px">
				<li v-for="(c, i) in conflicts" :key="i" style="margin-bottom: 4px">
					<b>{{ c.a }}</b> ↔ <b>{{ c.b }}</b> — {{ c.reason }}
				</li>
			</ul>
		</div>
		<div class="page-head" style="margin-top: 26px">
			<div><h2>{{ t('content') }}</h2><p>{{ items.length }} файлов · включайте, отключайте, обновляйте и удаляйте</p></div>
			<div class="row wrap">
				<button v-if="updatable.length" class="btn ghost" @click="updateAll"><Icon name="refresh" />Обновить всё ({{ updatable.length }})</button>
				<button class="btn ghost" @click="addFiles"><Icon name="upload" />Добавить файл</button>
				<button class="btn" @click="openBrowse(inst.id)"><Icon name="store" />Найти в каталоге</button>
			</div>
		</div>

		<div class="toolbar">
			<input v-model="q" class="input" placeholder="Поиск по содержимому…" />
			<div class="seg">
				<button :class="{ on: filter === 'all' }" @click="filter = 'all'">Все</button>
				<button v-for="(l, k) in typeLabel" :key="k" :class="{ on: filter === k }" @click="filter = String(k)">{{ l }} {{ counts[k] ?? 0 }}</button>
			</div>
		</div>

		<div v-if="loading && !items.length" class="empty">Загрузка…</div>
		<div v-else-if="shown.length" class="results">
			<article v-for="i in shown" :key="i.file_path" class="card row-item" :style="{ opacity: i.enabled ? 1 : 0.55 }">
				<img v-if="i.project?.icon_url" :src="i.project.icon_url" class="hit-ico sm" alt="" loading="lazy" />
				<div v-else class="hit-ico sm ph">{{ (i.project?.title ?? i.file_name).slice(0, 1).toUpperCase() }}</div>
				<div class="grow" style="min-width: 0">
					<div style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ i.project?.title ?? i.file_name }}</div>
					<div class="muted" style="font-size: 12px">
						{{ i.version?.version_number ?? i.file_name }} · {{ typeLabelOf(i.project_type) }} · {{ size(i.size) }}
					</div>
				</div>
				<span v-if="i.has_update" class="badge run">Есть обновление</span>
				<button v-if="i.has_update" class="iconbtn" title="Обновить" :disabled="busyPath[i.file_path]" @click="update(i)"><Icon name="refresh" /></button>
				<div class="toggle" :class="{ on: i.enabled }" :title="i.enabled ? 'Отключить' : 'Включить'" @click="!busyPath[i.file_path] && toggle(i)"></div>
				<button class="iconbtn" title="Удалить" :disabled="busyPath[i.file_path]" @click="remove(i)"><Icon name="trash" /></button>
			</article>
		</div>
		<div v-else class="empty card">
			<h3>{{ items.length ? 'Ничего не найдено' : 'Пока пусто' }}</h3>
			<p v-if="!items.length">Нажмите «Найти в каталоге», чтобы установить моды, ресурспаки или шейдеры.</p>
		</div>
	</template>
	<div v-else class="empty card"><h3>Сборка не найдена</h3><button class="btn" @click="go('library')">В библиотеку</button></div>
</template>

<style scoped>
.color-pick {
	width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent;
	cursor: pointer; padding: 0;
}
.color-pick.on { border-color: var(--text); box-shadow: 0 0 0 2px var(--bg); }
</style>
