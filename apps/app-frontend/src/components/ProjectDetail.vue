<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { openUrl } from '@tauri-apps/plugin-opener'

import Icon from './Icon.vue'
import { errMsg } from '../core/api'
import * as mr from '../core/modrinth'
import { t } from '../core/features'
import { instances, toast, trackJob } from '../core/store'

const props = defineProps<{
	hit: mr.Hit
	targetId: string
	installedIds: Set<string>
}>()
const emit = defineEmits<{ close: []; installed: [projectId: string] }>()

const tab = ref<'desc' | 'versions'>('desc')
const project = ref<mr.MrProject | null>(null)
const versions = ref<mr.MrVersion[]>([])
const loading = ref(true)
const busyId = ref<string | null>(null)
const filterGv = ref('')
const filterLoader = ref('')

const target = computed(() => instances.value.find((i) => i.id === props.targetId) ?? null)
const isModpack = computed(() => props.hit.project_type === 'modpack')

const gameVersionOptions = computed(() => {
	const s = new Set<string>()
	for (const v of versions.value) for (const g of v.game_versions) s.add(g)
	return [...s].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
})

const loaderOptions = computed(() => {
	const s = new Set<string>()
	for (const v of versions.value) for (const l of v.loaders) s.add(l)
	return [...s].sort()
})

const filteredVersions = computed(() => {
	return versions.value.filter((v) => {
		if (filterGv.value && !v.game_versions.includes(filterGv.value)) return false
		if (filterLoader.value && !v.loaders.includes(filterLoader.value)) return false
		return true
	})
})

async function load() {
	loading.value = true
	try {
		const [p, vs] = await Promise.all([
			mr.getProject(props.hit.project_id),
			mr.projectVersions(props.hit.project_id),
		])
		project.value = p
		versions.value = vs
		// preselect filters from target instance
		if (target.value) {
			if (target.value.game_version && gameVersionOptions.value.includes(target.value.game_version)) {
				filterGv.value = target.value.game_version
			}
			if (target.value.loader && target.value.loader !== 'vanilla') {
				const ls = mr.modLoadersFor(target.value.loader)
				const match = ls.find((l) => loaderOptions.value.includes(l))
				if (match) filterLoader.value = match
			}
		}
	} catch (e) {
		toast(errMsg(e), 'error')
	} finally {
		loading.value = false
	}
}

onMounted(load)
watch(() => props.hit.project_id, load)

function fmt(n: number) {
	return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)
}
function fmtDate(iso: string) {
	try {
		return new Date(iso).toLocaleDateString()
	} catch {
		return iso
	}
}
function typeLabel(v: mr.MrVersion) {
	const x = v.version_type || 'release'
	if (x === 'beta') return t('beta')
	if (x === 'alpha') return t('alpha')
	return t('release')
}
function typeClass(v: mr.MrVersion) {
	const x = v.version_type || 'release'
	return x === 'beta' ? 'vt-beta' : x === 'alpha' ? 'vt-alpha' : 'vt-rel'
}

async function installLatest() {
	if (isModpack.value) {
		busyId.value = 'pack'
		try {
			trackJob(await mr.installModpack(props.hit))
			toast(props.hit.title + '…', 'info')
			emit('installed', props.hit.project_id)
		} catch (e) {
			toast(errMsg(e), 'error', 8000)
		} finally {
			busyId.value = null
		}
		return
	}
	if (!target.value) return toast(t('selectInstance'), 'error')
	const first = filteredVersions.value[0] ?? versions.value[0]
	if (!first) return toast(t('noVersions'), 'error')
	await installVersion(first)
}

async function installVersion(v: mr.MrVersion) {
	if (isModpack.value) {
		busyId.value = v.id
		try {
			trackJob(
				await (await import('../core/api')).createModpackInstance({
					project_id: props.hit.project_id,
					version_id: v.id,
					title: props.hit.title,
					icon_url: props.hit.icon_url,
				}),
			)
			toast(props.hit.title + '…', 'info')
			emit('installed', props.hit.project_id)
		} catch (e) {
			toast(errMsg(e), 'error', 8000)
		} finally {
			busyId.value = null
		}
		return
	}
	if (!target.value) return toast(t('selectInstance'), 'error')
	busyId.value = v.id
	try {
		const r = await mr.installVersionIntoInstance(target.value, v.id)
		emit('installed', props.hit.project_id)
		toast(`${props.hit.title} → ${target.value.name}`, 'success')
		for (const w of r.warnings) toast(w, 'error', 7000)
	} catch (e) {
		toast(errMsg(e), 'error', 8000)
	} finally {
		busyId.value = null
	}
}

async function openMr() {
	const slug = project.value?.slug || props.hit.slug
	try {
		await openUrl(`https://modrinth.com/${props.hit.project_type}/${slug}`)
	} catch {
		/* ignore */
	}
}
</script>

<template>
	<div class="detail">
		<div class="row between" style="margin-bottom: 12px">
			<button class="btn ghost" @click="emit('close')"><Icon name="chevron" />{{ t('back') }}</button>
			<button class="btn ghost" @click="openMr">{{ t('openOnModrinth') }}</button>
		</div>

		<div v-if="loading" class="empty">{{ t('loading') }}</div>
		<template v-else>
			<header class="card head">
				<img v-if="hit.icon_url || project?.icon_url" :src="(hit.icon_url || project?.icon_url)!" class="big-ico" alt="" />
				<div v-else class="big-ico ph">{{ hit.title.slice(0, 1) }}</div>
				<div class="grow" style="min-width: 0">
					<h1 style="margin: 0; font-family: var(--font-head)">{{ project?.title || hit.title }}</h1>
					<p class="muted" style="margin: 4px 0 8px">{{ project?.description || hit.description }}</p>
					<div class="row" style="gap: 8px; flex-wrap: wrap">
						<span class="badge">⬇ {{ fmt(project?.downloads ?? hit.downloads) }}</span>
						<span class="badge">♥ {{ fmt(project?.followers ?? hit.follows) }}</span>
						<span v-for="c in (project?.categories || hit.categories).slice(0, 6)" :key="c" class="badge">{{ c }}</span>
					</div>
				</div>
				<button
					class="btn"
					:disabled="!!busyId || (!isModpack && !target)"
					@click="installLatest"
				>
					<Icon name="download" />
					{{ busyId ? t('installing') : installedIds.has(hit.project_id) && !isModpack ? t('alreadyInstalled') : t('install') }}
				</button>
			</header>

			<div class="seg" style="margin: 14px 0; align-self: flex-start">
				<button :class="{ on: tab === 'desc' }" @click="tab = 'desc'">{{ t('description') }}</button>
				<button :class="{ on: tab === 'versions' }" @click="tab = 'versions'">{{ t('versions') }}</button>
			</div>

			<div v-if="tab === 'desc'" class="card body-card">
				<div class="body-text" v-text="project?.body || project?.description || hit.description" />
			</div>

			<div v-else>
				<div class="row filters" style="gap: 8px; margin-bottom: 10px; flex-wrap: wrap">
					<select v-model="filterGv" class="input">
						<option value="">{{ t('allVersions') }}</option>
						<option v-for="g in gameVersionOptions" :key="g" :value="g">{{ g }}</option>
					</select>
					<select v-model="filterLoader" class="input">
						<option value="">{{ t('platform') }}</option>
						<option v-for="l in loaderOptions" :key="l" :value="l">{{ l }}</option>
					</select>
				</div>

				<div v-if="!filteredVersions.length" class="empty card">{{ t('noVersions') }}</div>
				<div v-else class="ver-table card">
					<div class="ver-row head">
						<span>{{ t('versions') }}</span>
						<span>{{ t('gameVersionCol') }}</span>
						<span>{{ t('platform') }}</span>
						<span>{{ t('published') }}</span>
						<span>{{ t('downloadsCol') }}</span>
						<span></span>
					</div>
					<div v-for="v in filteredVersions" :key="v.id" class="ver-row">
						<span class="ver-name">
							<span class="vt" :class="typeClass(v)">{{ typeLabel(v).slice(0, 1) }}</span>
							<b>{{ v.version_number }}</b>
							<span class="muted" style="font-size: 11px; margin-left: 6px">{{ v.name }}</span>
						</span>
						<span class="gv">
							<span v-for="g in v.game_versions.slice(0, 4)" :key="g" class="badge">{{ g }}</span>
							<span v-if="v.game_versions.length > 4" class="muted">+{{ v.game_versions.length - 4 }}</span>
						</span>
						<span class="gv">
							<span v-for="l in v.loaders" :key="l" class="badge">{{ l }}</span>
						</span>
						<span class="muted">{{ fmtDate(v.date_published) }}</span>
						<span class="muted">{{ v.downloads != null ? fmt(v.downloads) : '—' }}</span>
						<button
							class="btn sm"
							:disabled="!!busyId || (!isModpack && !target)"
							@click="installVersion(v)"
						>
							{{ busyId === v.id ? '…' : t('install') }}
						</button>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped>
.detail { animation: fade .2s ease; }
@keyframes fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
.head { display: flex; gap: 16px; align-items: flex-start; padding: 16px; }
.big-ico { width: 72px; height: 72px; border-radius: 14px; object-fit: cover; flex-shrink: 0; }
.big-ico.ph {
	display: grid; place-items: center; background: var(--surface-2);
	font-family: var(--font-head); font-size: 28px; color: var(--accent);
}
.body-card { padding: 16px 18px; }
.body-text {
	white-space: pre-wrap; line-height: 1.55; font-size: 14px; color: var(--text);
	max-height: 55vh; overflow: auto;
}
.ver-table { padding: 0; overflow: auto; max-height: 55vh; }
.ver-row {
	display: grid;
	grid-template-columns: minmax(160px, 1.4fr) minmax(120px, 1fr) minmax(90px, .7fr) 90px 70px 90px;
	gap: 8px; align-items: center;
	padding: 10px 14px; border-bottom: 1px solid var(--border, rgba(255,255,255,.06));
	font-size: 13px;
}
.ver-row.head { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-dim); position: sticky; top: 0; background: var(--surface); z-index: 1; }
.ver-name { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; }
.gv { display: flex; flex-wrap: wrap; gap: 4px; }
.vt {
	width: 18px; height: 18px; border-radius: 50%; display: inline-grid; place-items: center;
	font-size: 10px; font-weight: 700; margin-right: 6px; flex-shrink: 0;
}
.vt-rel { background: #3ecf8e33; color: #3ecf8e; }
.vt-beta { background: #f5a62333; color: #f5a623; }
.vt-alpha { background: #ff5c5c33; color: #ff5c5c; }
.btn.sm { padding: 6px 10px; font-size: 12px; }
.filters .input { min-width: 140px; }
</style>
