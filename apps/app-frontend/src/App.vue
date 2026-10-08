<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'

import Icon from './components/Icon.vue'
import LaunchOverlay from './components/LaunchOverlay.vue'
import LiveBackground from './components/LiveBackground.vue'
import MiniModeView from './components/MiniModeView.vue'
import TitleBar from './components/TitleBar.vue'
import { showWindow } from './core/api'
import { displayName, streamer, streamerActive, toggleStreamer, t, lang, playClick, miniMode, applyMiniWindowSize } from './core/features'
import { sparks, titleLabel, achPopups, ACHIEVEMENTS } from './core/economy'
import { activeJobs, activeUser, bootstrap, fatalError, go, nav, ready, toasts, type View } from './core/store'
import AccountsView from './views/AccountsView.vue'
import BrowseView from './views/BrowseView.vue'
import InstanceView from './views/InstanceView.vue'
import LibraryView from './views/LibraryView.vue'
import SettingsView from './views/SettingsView.vue'
import ShopView from './views/ShopView.vue'
import GamesView from './views/GamesView.vue'
import ThemesView from './views/ThemesView.vue'

const items = computed(() => {
	// depend on lang so labels update
	void lang.value
	return [
		{ id: 'library' as View, label: t('library'), icon: 'library' },
		{ id: 'browse' as View, label: t('browse'), icon: 'store' },
		{ id: 'accounts' as View, label: t('accounts'), icon: 'user' },
		{ id: 'themes' as View, label: t('themes'), icon: 'palette' },
		{ id: 'settings' as View, label: t('settings'), icon: 'settings' },
		{ id: 'tetris' as View, label: lang.value === 'en' ? 'Games' : 'Игры', icon: 'tetris' },
		{ id: 'shop' as View, label: t('shop'), icon: 'star' },
	]
})

const userLabel = computed(() => {
	if (!activeUser.value) return t('notLoggedIn')
	const name = displayName(activeUser.value.profile.name)
	const title = titleLabel()
	return title ? `${name} · ${title}` : name
})

const sparksLabel = computed(() => `✦ ${sparks.value}`)
function achDef(id: string) {
	return ACHIEVEMENTS.find((a) => a.id === id)
}

const shellClass = computed(() => ({
	'streamer-on': streamerActive.value,
	'streamer-compact': streamerActive.value && streamer.value.compactWindow,
}))

onMounted(async () => {
	await bootstrap()
	try {
		await showWindow()
	} catch (e) {
		console.warn('show_window failed', e)
	}
	document.addEventListener(
		'click',
		(e) => {
			const el = e.target as HTMLElement | null
			if (el?.closest('button, .nav, .toggle, .iconbtn')) playClick()
		},
		true,
	)
})

watch(
	shellClass,
	(c) => {
		document.documentElement.classList.toggle('streamer-on', !!c['streamer-on'])
		document.documentElement.classList.toggle('streamer-compact', !!c['streamer-compact'])
	},
	{ immediate: true, deep: true },
)

watch(
	() => miniMode.value.enabled,
	(on) => {
		void applyMiniWindowSize(on)
	},
)

</script>

<template>
	<div class="bg-layer"></div>
	<div class="grain"></div>
	<LiveBackground />

	<div class="shell" :class="[shellClass, { 'mini-shell': miniMode.enabled }]">
		<TitleBar />
		<div v-if="miniMode.enabled" class="mini-body">
			<MiniModeView />
		</div>
		<div v-else class="body">
			<aside class="sidebar">
				<button
					v-for="n in items"
					:key="n.id"
					class="nav"
					:class="{ active: nav.view === n.id || (n.id === 'library' && nav.view === 'instance') }"
					@click="go(n.id)"
				>
					<Icon :name="n.icon" /><span>{{ n.label }}</span>
				</button>
				<div class="grow"></div>

				<button
					class="nav streamer-btn"
					:class="{ active: streamerActive }"
					:title="t('streamerMode')"
					@click="toggleStreamer"
				>
					<span class="streamer-dot" :class="{ on: streamerActive }"></span>
					<span>{{ streamerActive ? t('streamerOn') : t('streamerMode') }}</span>
				</button>

				<div v-if="activeJobs.length" class="card" style="padding: 10px 12px; font-size: 12px">
					<span class="badge run"><i class="pulse"></i>{{ t('installingN') }}: {{ activeJobs.length }}</span>
				</div>
				<button class="nav sparks-nav" @click="go('shop')" :title="t('sparks')">
					<span>{{ sparksLabel }}</span>
				</button>
				<div class="userchip" @click="go('accounts')">
					<img
						v-if="activeUser"
						:src="`https://mc-heads.net/avatar/${activeUser.profile.id.replace(/-/g, '')}/64`"
						alt=""
						:class="{ 'blur-avatar': streamerActive && streamer.blurAvatars }"
					/>
					<img v-else alt="" />
					<div style="min-width: 0">
						<div class="n">{{ userLabel }}</div>
						<div v-if="!(streamerActive && streamer.hideAccountDetails)" class="s">
							{{ activeUser ? 'Microsoft' : t('clickToLogin') }}
						</div>
						<div v-else class="s">{{ t('hidden') }}</div>
					</div>
				</div>
			</aside>
			<main class="main">
				<LibraryView v-if="nav.view === 'library'" />
				<BrowseView v-else-if="nav.view === 'browse'" :key="nav.browseInstanceId ?? 'x'" />
				<InstanceView v-else-if="nav.view === 'instance'" />
				<AccountsView v-else-if="nav.view === 'accounts'" />
				<ThemesView v-else-if="nav.view === 'themes'" />
				<GamesView v-else-if="nav.view === 'tetris'" />
				<ShopView v-else-if="nav.view === 'shop'" />
				<SettingsView v-else />
			</main>
		</div>
	</div>

	<div v-if="!ready && !fatalError" class="splash">
		<div><div class="spinner"></div><div class="muted">{{ t('coreStarting') }}</div></div>
	</div>
	<div v-if="fatalError" class="splash">
		<div class="card err-box">
			<h2>{{ t('coreFailed') }}</h2>
			<p class="muted">{{ t('coreFailedHint') }}</p>
			<pre class="mono" style="white-space: pre-wrap">{{ fatalError }}</pre>
		</div>
	</div>

	<!-- Steam-style achievements -->
	<div class="ach-popups">
		<div v-for="p in achPopups" :key="p.uid" class="ach-popup">
			<template v-if="achDef(p.id)">
				<div class="ach-popup-ico">{{ achDef(p.id)!.icon }}</div>
				<div class="ach-popup-body">
					<div class="ach-popup-label">{{ t('achUnlocked') }}</div>
					<div class="ach-popup-name">{{ t(achDef(p.id)!.nameKey) }}</div>
					<div class="ach-popup-desc">{{ t(achDef(p.id)!.descKey) }}</div>
				</div>
			</template>
		</div>
	</div>

	<div class="toasts">
		<div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">{{ t.text }}</div>
	</div>

	<LaunchOverlay />
</template>
