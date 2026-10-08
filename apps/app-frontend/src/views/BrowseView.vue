<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import Icon from '../components/Icon.vue'
import { errMsg } from '../core/api'
import * as mr from '../core/modrinth'
import { t } from '../core/features'
import { instances, nav, toast, trackJob } from '../core/store'

const kinds = [
	{ id: 'mod' as const, labelKey: 'mods' },
	{ id: 'modpack' as const, labelKey: 'modpacks' },
	{ id: 'resourcepack' as const, labelKey: 'resourcepacks' },
	{ id: 'shader' as const, labelKey: 'shaders' },
	{ id: 'datapack' as const, labelKey: 'datapacks' },
]
const kind = ref<mr.ProjectKind>('mod')
const query = ref('')
const index = ref<'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'>('relevance')
const targetId = ref<string>(nav.browseInstanceId ?? instances.value[0]?.id ?? '')
const onlyCompatible = ref(true)

const hits = ref<mr.Hit[]>([])
const total = ref(0)
const loading = ref(false)
const busy = ref<Record<string, 'working' | 'done'>>({})

const target = computed(() => instances.value.find((i) => i.id === targetId.value) ?? null)
const needsTarget = computed(() => kind.value !== 'modpack')

let timer: ReturnType<typeof setTimeout> | undefined
let reqId = 0

async function load(reset: boolean) {
	const my = ++reqId
	loading.value = true
	try {
		const res = await mr.search({
			query: query.value.trim(),
			kind: kind.value,
			index: index.value,
			offset: reset ? 0 : hits.value.length,
			gameVersion: needsTarget.value && onlyCompatible.value ? target.value?.game_version : undefined,
			loader: needsTarget.value && onlyCompatible.value ? target.value?.loader : undefined,
		})
		if (my !== reqId) return
		hits.value = reset ? res.hits : [...hits.value, ...res.hits]
		total.value = res.total_hits
	} catch (e) {
		if (my === reqId) toast(`${t('searchFailed')}: ${errMsg(e)}`, 'error')
	} finally {
		if (my === reqId) loading.value = false
	}
}

watch([kind, index, targetId, onlyCompatible], () => load(true))
watch(query, () => {
	clearTimeout(timer)
	timer = setTimeout(() => load(true), 350)
})
onMounted(() => load(true))

function fmt(n: number) {
	return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)
}

async function install(h: mr.Hit) {
	busy.value[h.project_id] = 'working'
	try {
		if (h.project_type === 'modpack') {
			trackJob(await mr.installModpack(h))
			toast(`${h.title}…`, 'info')
			busy.value[h.project_id] = 'done'
			return
		}
		if (!target.value) throw new Error(t('selectInstance'))
		const r = await mr.installIntoInstance(target.value, h.project_id, h.project_type)
		busy.value[h.project_id] = 'done'
		toast(`${h.title} → ${target.value.name}`, 'success')
		for (const w of r.warnings) toast(w, 'error', 7000)
	} catch (e) {
		delete busy.value[h.project_id]
		toast(`${h.title}: ${errMsg(e)}`, 'error', 9000)
	}
}
</script>

<template>
	<div class="page-head">
		<div>
			<h1>{{ t('catalog') }}</h1>
			<p>{{ t('catalogSub') }}</p>
		</div>
	</div>

	<div class="seg" style="margin-bottom: 14px">
		<button v-for="k in kinds" :key="k.id" :class="{ on: kind === k.id }" @click="kind = k.id">{{ t(k.labelKey) }}</button>
	</div>

	<div class="toolbar">
		<input v-model="query" class="input" :placeholder="t('searchShort')" />
		<select v-model="index" class="select">
			<option value="relevance">{{ t('byRelevance') }}</option>
			<option value="downloads">{{ t('byDownloads') }}</option>
			<option value="follows">{{ t('byFollows') }}</option>
			<option value="newest">{{ t('byNewest') }}</option>
			<option value="updated">{{ t('byUpdated') }}</option>
		</select>
		<template v-if="needsTarget">
			<select v-model="targetId" class="select" :title="t('selectInstance')">
				<option v-if="!instances.length" value="">—</option>
				<option v-for="i in instances" :key="i.id" :value="i.id">{{ i.name }} · {{ i.loader }} {{ i.game_version }}</option>
			</select>
			<button class="btn ghost" :style="onlyCompatible ? 'border-color:var(--accent);color:var(--accent)' : ''" @click="onlyCompatible = !onlyCompatible">
				<Icon name="check" />{{ t('compatibleOnly') }}
			</button>
		</template>
	</div>

	<div v-if="needsTarget && !instances.length" class="empty card">
		<h3>{{ t('createInstance') }}</h3>
		<p>{{ t('notSignedInHint') }}</p>
	</div>

	<div v-else class="results">
		<article v-for="h in hits" :key="h.project_id" class="card hoverable hit">
			<img v-if="h.icon_url" :src="h.icon_url" class="hit-ico" alt="" loading="lazy" />
			<div v-else class="hit-ico ph">{{ h.title.slice(0, 1) }}</div>
			<div class="grow" style="min-width: 0">
				<div class="row" style="gap: 8px; flex-wrap: wrap">
					<b style="font-family: var(--font-head); font-size: 15px">{{ h.title }}</b>
					<span class="muted" style="font-size: 12px">от {{ h.author }}</span>
				</div>
				<div class="muted hit-desc">{{ h.description }}</div>
				<div class="meta" style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap">
					<span class="badge">⬇ {{ fmt(h.downloads) }}</span>
					<span v-for="c in h.categories.slice(0, 4)" :key="c" class="badge">{{ c }}</span>
				</div>
			</div>
			<button
				class="btn"
				:class="{ ghost: busy[h.project_id] === 'done' }"
				:disabled="busy[h.project_id] === 'working' || (needsTarget && !target)"
				@click="install(h)"
			>
				<Icon :name="busy[h.project_id] === 'done' ? 'check' : 'download'" />
				{{ busy[h.project_id] === 'working' ? 'Установка…' : busy[h.project_id] === 'done' ? 'Готово' : h.project_type === 'modpack' ? 'Установить сборкой' : 'Установить' }}
			</button>
		</article>

		<div v-if="loading" class="empty">Загрузка…</div>
		<div v-else-if="!hits.length" class="empty card"><h3>Ничего не найдено</h3><p>Измените запрос или отключите «{{ t('compatibleOnly') }}».</p></div>
		<div v-if="!loading && hits.length < total" style="text-align: center; margin-top: 14px">
			<button class="btn ghost" @click="load(false)">Показать ещё ({{ hits.length }} из {{ total }})</button>
		</div>
	</div>
</template>
