<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'

import { applyMiniWindowSize, miniMode } from '../core/features'
import Icon from './Icon.vue'

function w() {
	try {
		return getCurrentWindow()
	} catch {
		return null
	}
}

async function toggleMini() {
	miniMode.value.enabled = !miniMode.value.enabled
	await applyMiniWindowSize(miniMode.value.enabled)
}
</script>

<template>
	<header class="titlebar" data-tauri-drag-region>
		<span class="dot" data-tauri-drag-region></span>
		<span class="brand" data-tauri-drag-region>NOVA LAUNCHER</span>
		<div class="spacer" data-tauri-drag-region></div>
		<button
			class="winbtn"
			:title="miniMode.enabled ? 'Полный режим' : 'Мини-режим'"
			:class="{ on: miniMode.enabled }"
			@click="toggleMini"
		>
			<span style="font-size: 11px; font-weight: 700">{{ miniMode.enabled ? '▣' : '▤' }}</span>
		</button>
		<button class="winbtn" title="Свернуть" @click="w()?.minimize()"><Icon name="min" style="width:15px" /></button>
		<button v-if="!miniMode.enabled" class="winbtn" title="Развернуть" @click="w()?.toggleMaximize()"><Icon name="max" style="width:14px" /></button>
		<button class="winbtn close" title="Закрыть" @click="w()?.close()"><Icon name="close" style="width:15px" /></button>
	</header>
</template>
