<script setup lang="ts">
import { computed } from 'vue'
import type { IconValue } from '../core/iconPack'

const props = defineProps<{
	name: string
	/** Override: builtin / image / emoji from icon pack */
	custom?: IconValue | null
}>()

const paths: Record<string, string> = {
	spark: 'M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z',
	chevron: 'M15 18l-6-6 6-6',
	download: 'M12 3v12m0 0l-4-4m4 4l4-4M5 21h14',
	library: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
	user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
	palette:
		'M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8zM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01',
	settings:
		'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
	play: 'M7 4v16l13-8z',
	stop: 'M6 6h12v12H6z',
	star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z',
	folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
	search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
	grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
	list: 'M4 6h16M4 12h16M4 18h16',
	plus: 'M12 5v14M5 12h14',
	trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
	copy: 'M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10',
	upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 20h16',
	check: 'M5 12l5 5 9-10',
	min: 'M5 12h14',
	max: 'M6 6h12v12H6z',
	close: 'M6 6l12 12M18 6L6 18',
	refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
	back: 'M15 6l-6 6 6 6',
	store: 'M3 9l1-5h16l1 5M5 9v11h14V9M9 20v-6h6v6M3 9h18',
	edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
	tetris: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h5v11h-5zM3 13h8v8H3z',
	admin: 'M12 3l2 4h4l-3 3 1 5-4-2-4 2 1-5-3-3h4z',
}

const mode = computed(() => {
	const c = props.custom
	if (!c) return { kind: 'svg' as const, name: props.name }
	if (c.type === 'image') return { kind: 'img' as const, src: c.dataUrl }
	if (c.type === 'emoji') return { kind: 'emoji' as const, emoji: c.emoji }
	return { kind: 'svg' as const, name: c.name || props.name }
})

const path = computed(() => {
	if (mode.value.kind !== 'svg') return ''
	return paths[mode.value.name] ?? paths[props.name] ?? ''
})
const fillSvg = computed(() => {
	const n = mode.value.kind === 'svg' ? mode.value.name : props.name
	return n === 'play' || n === 'star'
})
</script>

<template>
	<img v-if="mode.kind === 'img'" class="ico-img" :src="mode.src" alt="" />
	<span v-else-if="mode.kind === 'emoji'" class="ico-emoji">{{ mode.emoji }}</span>
	<svg
		v-else
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path :d="path" :fill="fillSvg ? 'currentColor' : 'none'" />
	</svg>
</template>

<style scoped>
.ico-img {
	width: 1.15em;
	height: 1.15em;
	object-fit: contain;
	border-radius: 4px;
	display: block;
}
.ico-emoji {
	font-size: 1.05em;
	line-height: 1;
	display: grid;
	place-items: center;
	width: 1.15em;
	height: 1.15em;
}
</style>
