<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import Icon from '../components/Icon.vue'
import ProjectDetail from '../components/ProjectDetail.vue'
import { errMsg, getInstalledProjectIds } from '../core/api'
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
const targetId = ref<string>(nav.browseInstanceId ?? '')
const onlyCompatible = ref(!!nav.browseInstanceId)

const hits = ref<mr.Hit[]>([])
const total = ref(0)
const loading = ref(false)
const busy = ref<Record<string, 'working' | 'done'>>({})
const installedIds = ref<Set<string>>(new Set())
const detail = ref<mr.Hit | null>(null)

const target = computed(() => instances.value.find((i) => i.id === targetId.value) ?? null)
const needsTarget = computed(() => kind.value !== 'modpack')

let timer: ReturnType<typeof setTimeout> | undefined
let reqId = 0

async function load(reset: boolean) {
	const my = ++reqId
	loading.value = true
	try {
		const filterByInstance = needsTarget.value && onlyCompatible.value && !!target.value
		const res = await mr.search({
			query: query.value.trim(),
			kind: kind.value,
			index: index.value,
			offset: reset ? 0 : hits.value.length,
			gameVersion: filterByInstance ? target.value!.game_version : undefined,
			loader: filterByInstance ? target.value!.loader : undefined,
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

async function refreshInstalled() {
	installedIds.value = new Set()
	if (!targetId.value || kind.value === 'modpack') return
	try {
		const ids = await getInstalledProjectIds(targetId.value)
		installedIds.value = new Set(ids)
	} catch {
		installedIds.value = new Set()
	}
}

watch(targetId, (id) => {
	if (!id) onlyCompatible.value = false
})
watch([kind, index, targetId, onlyCompatible], () => {
	void refreshInstalled()
	load(true)
})
watch(query, () => {
	clearTimeout(timer)
	timer = setTimeout(() => load(true), 350)
})
onMounted(() => {
	void refreshInstalled()
	load(true)
})

function fmt(n: number) {
	return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)
}

function onDetailInstalled(id: string) {
	installedIds.value = new Set([...installedIds.value, id])
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
		installedIds.value = new Set([...installedIds.value, h.project_id])
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
				<option value="">{{ t('anyVersion') }}</option>
				<option v-for="i in instances" :key="i.id" :value="i.id">{{ i.name }} · {{ i.loader }} {{ i.game_version }}</option>
			</select>
			<button
				class="btn ghost"
				:disabled="!targetId"
				:style="onlyCompatible && targetId ? 'border-color:var(--accent);color:var(--accent)' : ''"
				:title="!targetId ? t('browseNoTargetHint') : t('compatibleOnly')"
				@click="targetId && (onlyCompatible = !onlyCompatible)"
			>
				<Icon name="check" />{{ t('compatibleOnly') }}
			</button>
		</template>
	</div>

	<p v-if="needsTarget && !targetId" class="muted" style="font-size: 12px; margin: -6px 0 12px">{{ t('browseNoTargetHint') }}</p>

	<ProjectDetail
		v-if="detail"
		:hit="detail"
		:target-id="targetId"
		:installed-ids="installedIds"
		@close="detail = null"
		@installed="onDetailInstalled"
	/>
	<div v-else class="results">
		<article v-for="h in hits" :key="h.project_id" class="card hoverable hit" style="cursor:pointer" @click="detail = h">
			<img v-if="h.icon_url" :src="h.icon_url" class="hit-ico" alt="" loading="lazy" />
			<div v-else class="hit-ico ph">{{ h.title.slice(0, 1) }}</div>
			<div class="grow" style="min-width: 0">
				<div class="row" style="gap: 8px; flex-wrap: wrap">
					<b style="font-family: var(--font-head); font-size: 15px">{{ h.title }}</b>
					<span class="muted" style="font-size: 12px">{{ t('byAuthor') }} {{ h.author }}</span>
				</div>
				<div class="muted hit-desc">{{ h.description }}</div>
				<div class="meta" style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap">
					<span class="badge">⬇ {{ fmt(h.downloads) }}</span>
					<span v-for="c in h.categories.slice(0, 4)" :key="c" class="badge">{{ c }}</span>
				</div>
			</div>
			<button
				class="btn"
				:class="{ ghost: busy[h.project_id] === 'done' || installedIds.has(h.project_id) }"
				:disabled="busy[h.project_id] === 'working' || (needsTarget && !target) || (installedIds.has(h.project_id) && h.project_type !== 'modpack')"
				@click.stop="install(h)"
			>
				<Icon :name="busy[h.project_id] === 'done' || installedIds.has(h.project_id) ? 'check' : 'download'" />
				{{
					busy[h.project_id] === 'working' ? t('installing')
					: installedIds.has(h.project_id) && h.project_type !== 'modpack' ? t('alreadyInstalled')
					: busy[h.project_id] === 'done' ? t('done')
					: h.project_type === 'modpack' ? t('installAsPack')
					: t('install')
				}}
			</button>
		</article>

		<div v-if="loading" class="empty">{{ t('loading') }}</div>
		<div v-else-if="!hits.length" class="empty card"><h3>{{ t('nothingFound') }}</h3><p>{{ t('changeFilters') }}</p></div>
		<div v-if="!loading && hits.length < total" style="text-align: center; margin-top: 14px">
			<button class="btn ghost" @click="load(false)">{{ t('showMore') }} ({{ hits.length }} {{ t('ofTotal') }} {{ total }})</button>
		</div>
	</div>
</template>
