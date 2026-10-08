<script setup lang="ts">
import { computed } from 'vue'

import { instanceIconUrl } from '../core/api'
import { miniMode, t } from '../core/features'
import { favorites, instances, launching, play, running, stop } from '../core/store'
import Icon from './Icon.vue'

const list = computed(() => {
	const ready = instances.value.filter(
		(i) => i.install_stage === 'installed' || i.install_stage === 'pack_installed',
	)
	if (miniMode.value.favoritesOnly) {
		const fav = ready.filter((i) => favorites.value.includes(i.id))
		if (fav.length) return fav
	}
	return [...ready]
		.sort((a, b) => {
			const ta = a.last_played ? new Date(a.last_played).getTime() : 0
			const tb = b.last_played ? new Date(b.last_played).getTime() : 0
			return tb - ta
		})
		.slice(0, 12)
})
</script>

<template>
	<div class="mini-root">
		<div class="mini-head">
			<span class="mini-brand">NOVA</span>
			<span class="muted" style="font-size: 11px">{{ list.length }}</span>
		</div>
		<div class="mini-list">
			<div v-for="inst in list" :key="inst.id" class="mini-row">
				<div class="mini-ico">
					<img v-if="instanceIconUrl(inst.icon_path)" :src="instanceIconUrl(inst.icon_path)!" alt="" />
					<span v-else>{{ inst.name.slice(0, 1) }}</span>
				</div>
				<div class="mini-meta">
					<div class="mini-name" :title="inst.name">{{ inst.name }}</div>
					<div class="muted" style="font-size: 10px">{{ inst.loader }} · {{ inst.game_version }}</div>
				</div>
				<button
					v-if="running[inst.id]"
					class="btn danger mini-btn"
					@click="stop(inst)"
				>
					<Icon name="stop" />
				</button>
				<button
					v-else
					class="btn mini-btn"
					:disabled="!!launching[inst.id]"
					@click="play(inst)"
				>
					<Icon name="play" />
				</button>
			</div>
			<div v-if="!list.length" class="muted" style="padding: 20px; text-align: center; font-size: 12px">
				{{ t('library') }} — empty
			</div>
		</div>
	</div>
</template>

<style scoped>
.mini-root {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	padding: 8px;
	gap: 8px;
}
.mini-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 6px;
}
.mini-brand {
	font-family: var(--font-head);
	font-weight: 800;
	letter-spacing: 0.12em;
	font-size: 12px;
}
.mini-list {
	flex: 1;
	overflow: auto;
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.mini-row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 10px;
	border-radius: var(--radius-sm);
	background: var(--surface);
	border: 1px solid var(--border);
}
.mini-ico {
	width: 32px;
	height: 32px;
	border-radius: 8px;
	background: var(--surface-2);
	display: grid;
	place-items: center;
	font-weight: 700;
	overflow: hidden;
	flex: none;
}
.mini-ico img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.mini-meta {
	flex: 1;
	min-width: 0;
}
.mini-name {
	font-weight: 600;
	font-size: 13px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.mini-btn {
	padding: 8px 10px;
	flex: none;
}
.mini-btn :deep(svg) {
	width: 14px;
	height: 14px;
}
</style>
