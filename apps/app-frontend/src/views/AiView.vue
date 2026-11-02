<script setup lang="ts">
import { ref } from 'vue'
import { openUrl } from '@tauri-apps/plugin-opener'

import Icon from '../components/Icon.vue'
import { t } from '../core/features'

type AiId = 'chatgpt' | 'grok' | 'gemini' | 'deepseek'

interface AiProvider {
	id: AiId
	name: string
	url: string
	color: string
	blurbKey: string
}

const providers: AiProvider[] = [
	{
		id: 'chatgpt',
		name: 'ChatGPT',
		url: 'https://chatgpt.com',
		color: '#10a37f',
		blurbKey: 'aiChatgpt',
	},
	{
		id: 'grok',
		name: 'Grok',
		url: 'https://grok.com',
		color: '#a78bfa',
		blurbKey: 'aiGrok',
	},
	{
		id: 'gemini',
		name: 'Gemini',
		url: 'https://gemini.google.com',
		color: '#4285f4',
		blurbKey: 'aiGemini',
	},
	{
		id: 'deepseek',
		name: 'DeepSeek',
		url: 'https://chat.deepseek.com',
		color: '#4d6bfe',
		blurbKey: 'aiDeepseek',
	},
]

const active = ref<AiId>('grok')
const status = ref('')
const busy = ref(false)

const current = () => providers.find((p) => p.id === active.value)!

/** Open AI site in a separate Tauri window (user logs into their own account). */
async function openInAppWindow(p: AiProvider) {
	busy.value = true
	status.value = ''
	try {
		const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
		const label = `nova-ai-${p.id}`
		const existing = await WebviewWindow.getByLabel(label)
		if (existing) {
			await existing.setFocus()
			status.value = t('aiWindowFocused')
			return
		}
		const win = new WebviewWindow(label, {
			url: p.url,
			title: `${p.name} · Nova`,
			width: 1180,
			height: 780,
			center: true,
			focus: true,
			resizable: true,
		})
		win.once('tauri://error', (e) => {
			console.warn('webview error', e)
			void openInBrowser(p)
		})
		status.value = t('aiWindowOpened')
	} catch (e) {
		console.warn(e)
		await openInBrowser(p)
	} finally {
		busy.value = false
	}
}

async function openInBrowser(p: AiProvider) {
	try {
		await openUrl(p.url)
		status.value = t('aiBrowserOpened')
	} catch (e) {
		status.value = String(e)
	}
}

function select(id: AiId) {
	active.value = id
	status.value = ''
}
</script>

<template>
	<div class="page-head">
		<div>
			<h1>{{ t('ai') }}</h1>
			<p>{{ t('aiSub') }}</p>
		</div>
	</div>

	<p class="hint muted">{{ t('aiHint') }}</p>

	<div class="ai-grid">
		<button
			v-for="p in providers"
			:key="p.id"
			class="card ai-card"
			:class="{ on: active === p.id }"
			:style="{ '--ai': p.color }"
			@click="select(p.id)"
		>
			<div class="ai-logo" :style="{ background: p.color + '22', color: p.color }">
				{{ p.name.slice(0, 1) }}
			</div>
			<div class="grow">
				<b>{{ p.name }}</b>
				<div class="muted" style="font-size: 12px; margin-top: 4px">{{ t(p.blurbKey) }}</div>
			</div>
		</button>
	</div>

	<div class="card ai-panel">
		<div class="row between" style="flex-wrap: wrap; gap: 10px">
			<div>
				<h2 style="margin: 0; font-family: var(--font-head)">{{ current().name }}</h2>
				<div class="muted" style="font-size: 12px; margin-top: 4px">{{ current().url }}</div>
			</div>
			<div class="row" style="gap: 8px; flex-wrap: wrap">
				<button class="btn" :disabled="busy" @click="openInAppWindow(current())">
					<Icon name="play" />{{ t('aiOpenWindow') }}
				</button>
				<button class="btn ghost" :disabled="busy" @click="openInBrowser(current())">
					{{ t('aiOpenBrowser') }}
				</button>
			</div>
		</div>
		<p v-if="status" class="muted" style="margin: 12px 0 0; font-size: 13px">{{ status }}</p>
		<ul class="ai-notes muted">
			<li>{{ t('aiNote1') }}</li>
			<li>{{ t('aiNote2') }}</li>
			<li>{{ t('aiNote3') }}</li>
		</ul>
	</div>
</template>

<style scoped>
.hint { margin: 0 0 14px; font-size: 13px; max-width: 640px; }
.ai-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 12px;
	margin-bottom: 16px;
}
.ai-card {
	display: flex;
	gap: 12px;
	align-items: center;
	padding: 14px;
	text-align: left;
	cursor: pointer;
	border: 1px solid transparent;
	background: var(--surface);
	color: var(--text);
	transition: border-color .15s, transform .15s;
}
.ai-card:hover { border-color: color-mix(in srgb, var(--ai) 50%, transparent); }
.ai-card.on {
	border-color: var(--ai);
	box-shadow: 0 0 0 1px color-mix(in srgb, var(--ai) 35%, transparent);
}
.ai-logo {
	width: 44px; height: 44px; border-radius: 12px;
	display: grid; place-items: center;
	font-family: var(--font-head); font-size: 20px; font-weight: 700;
	flex-shrink: 0;
}
.ai-panel { padding: 18px; }
.ai-notes {
	margin: 14px 0 0;
	padding-left: 18px;
	font-size: 12px;
	line-height: 1.5;
}
</style>
