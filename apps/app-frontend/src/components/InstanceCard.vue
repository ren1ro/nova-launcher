<script setup lang="ts">
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { computed } from 'vue'

import { getInstancePath, type Instance, instanceIconUrl } from '../core/api'
import { groupOf, instanceColor, streamer, t } from '../core/features'
import { favorites, jobFor, launching, openInstance, play, progress, running, stop, toast, toggleFavorite } from '../core/store'
import Icon from './Icon.vue'

const props = defineProps<{ inst: Instance; delay?: number }>()

const isRunning = computed(() => !!running[props.inst.id])
const isLaunching = computed(() => !!launching[props.inst.id])
const job = computed(() => jobFor(props.inst.id))
const prog = computed(() => {
	if (job.value?.progress && job.value.progress.total)
		return { fraction: job.value.progress.current / job.value.progress.total, message: t('installing') }
	return progress[props.inst.id]
})
const isFav = computed(() => favorites.value.includes(props.inst.id))
const icon = computed(() => instanceIconUrl(props.inst.icon_path))
const installing = computed(() =>
	['minecraft_installing', 'pack_installing'].includes(props.inst.install_stage),
)
const broken = computed(() => props.inst.install_stage === 'not_installed')
const grp = computed(() => groupOf(props.inst.id))
const labelColor = computed(() => instanceColor.value[props.inst.id] || grp.value?.color || null)

const loaderLabel: Record<string, string> = {
	vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge', quilt: 'Quilt', neoforge: 'NeoForge',
}

function ago(iso?: string | null) {
	if (!iso) return '—'
	const s = (Date.now() - new Date(iso).getTime()) / 1000
	if (s < 60) return '•'
	if (s < 3600) return `${Math.floor(s / 60)} мин`
	if (s < 86400) return `${Math.floor(s / 3600)} ч`
	return `${Math.floor(s / 86400)} дн`
}
function hours(sec: number) {
	const h = sec / 3600
	return h < 1 ? `${Math.round(sec / 60)} мин` : `${h.toFixed(1)} ч`
}
async function openFolder() {
	try {
		await revealItemInDir(await getInstancePath(props.inst.id))
	} catch (e) {
		toast(`Folder: ${e}`, 'error')
	}
}
</script>

<template>
	<article
		class="card hoverable inst"
		:style="{
			animationDelay: (delay ?? 0) + 'ms',
			borderLeft: labelColor ? `3px solid ${labelColor}` : undefined,
		}"
	>
		<button class="iconbtn fav" :class="{ on: isFav }" :title="t('favorites')" @click="toggleFavorite(inst.id)">
			<Icon name="star" />
		</button>
		<div class="top">
			<div class="ico" style="cursor: pointer" @click="openInstance(inst.id)">
				<img v-if="icon" :src="icon" alt="" />
				<template v-else>{{ inst.name.slice(0, 1).toUpperCase() }}</template>
			</div>
			<div style="min-width: 0">
				<div class="name" style="cursor: pointer" :title="inst.name" @click="openInstance(inst.id)">{{ inst.name }}</div>
				<div class="meta">
					<span v-if="grp" class="badge" :style="{ borderColor: grp.color, color: grp.color }">{{ grp.name }}</span>
					<span class="badge">{{ loaderLabel[inst.loader] ?? inst.loader }}</span>
					<span class="badge">{{ inst.game_version }}</span>
					<span v-if="isRunning" class="badge run"><i class="pulse"></i>{{ t('running') }}</span>
					<span v-else-if="isLaunching" class="badge run"><i class="pulse"></i>{{ t('launching') }}…</span>
					<span v-else-if="installing || job" class="badge run"><i class="pulse"></i>{{ t('installing') }}</span>
					<span v-else-if="broken" class="badge warn">{{ t('notInstalled') }}</span>
					<span v-else class="badge ok">{{ t('ready') }}</span>
				</div>
			</div>
		</div>
		<div v-if="prog && !isRunning" class="bar" :title="prog.message"><i :style="{ width: prog.fraction * 100 + '%' }"></i></div>
		<div class="foot">
			<div class="muted" style="font-size: 12px; line-height: 1.5">
				{{ ago(inst.last_played) }}
				<template v-if="inst.submitted_time_played && !(streamer.enabled && streamer.hidePlaytime)">
					<br />{{ t('hoursPlayed') }}: {{ hours(inst.submitted_time_played) }}
				</template>
			</div>
			<div class="row" style="gap: 8px">
				<button class="iconbtn" title="Folder" @click="openFolder"><Icon name="folder" /></button>
				<button v-if="isRunning" class="btn danger" @click="stop(inst)"><Icon name="stop" />{{ t('stop') }}</button>
				<button v-else class="btn" :disabled="isLaunching || installing || !!job" @click="play(inst)">
					<Icon name="play" />{{ isLaunching ? t('launching') : t('play') }}
				</button>
			</div>
		</div>
	</article>
</template>
