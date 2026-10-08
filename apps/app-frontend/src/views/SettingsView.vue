<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { type AppSettings, errMsg, getSettings, setSettings } from '../core/api'
import {
	BG_IMAGE_PRESETS,
	autoTheme,
	clearHistory,
	discordRpc,
	epicHide,
	formatAgo,
	lang,
	launchHistory,
	liveBg,
	miniMode,
	playClick,
	playLaunchSound,
	seasonal,
	sounds,
	streamer,
	t,
	type Lang,
	type LiveBgKind,
} from '../core/features'
import { openInstance, toast } from '../core/store'
import { allThemes } from '../themes/engine'

const s = ref<AppSettings | null>(null)
const args = ref('')
const saving = ref(false)

const liveKinds: { id: LiveBgKind; labelKey: string }[] = [
	{ id: 'none', labelKey: 'none' },
	{ id: 'particles', labelKey: 'particles' },
	{ id: 'stars', labelKey: 'stars' },
	{ id: 'aurora', labelKey: 'aurora' },
	{ id: 'waves', labelKey: 'waves' },
	{ id: 'image', labelKey: 'image' },
]

onMounted(async () => {
	try {
		s.value = await getSettings()
		args.value = (s.value.extra_launch_args ?? []).join(' ')
	} catch (e) {
		toast(`Settings: ${errMsg(e)}`, 'error')
	}
})

async function save() {
	if (!s.value) return
	saving.value = true
	try {
		s.value.extra_launch_args = args.value.trim() ? args.value.trim().split(/\s+/) : []
		s.value.hide_on_process_start = !!epicHide.value.enabled
		await setSettings(s.value)
		toast(lang.value === 'en' ? 'Saved' : 'Настройки сохранены', 'success')
	} catch (e) {
		toast(`${errMsg(e)}`, 'error')
	} finally {
		saving.value = false
	}
}

function setLang(l: Lang) {
	lang.value = l
}

function pickPreset(url: string) {
	liveBg.value.customImage = url
	liveBg.value.kind = 'image'
	liveBg.value.enabled = true
}
</script>

<template>
	<div class="page-head">
		<div>
			<h1>{{ t('settings') }}</h1>
			<p>{{ t('globalSettings') }}</p>
		</div>
		<button class="btn" :disabled="!s || saving" @click="save">{{ t('save') }}</button>
	</div>

	<!-- Language -->
	<section class="card section">
		<h3>{{ t('language') }}</h3>
		<div class="seg">
			<button :class="{ on: lang === 'ru' }" @click="setLang('ru')">Русский</button>
			<button :class="{ on: lang === 'en' }" @click="setLang('en')">English</button>
		</div>
	</section>

	<!-- Epic hide -->
	<section class="card section">
		<h3>{{ lang === 'en' ? 'While playing' : 'Во время игры' }}</h3>
		<div class="setrow">
			<div>
				<div>{{ lang === 'en' ? 'Hide launcher when game starts' : 'Скрывать лаунчер при запуске сборки' }}</div>
				<div class="d">{{ lang === 'en' ? 'Show again when you quit Minecraft (like Epic)' : 'Показать снова, когда выйдете из Minecraft (как в Epic)' }}</div>
			</div>
			<div class="toggle" :class="{ on: epicHide.enabled }" @click="epicHide.enabled = !epicHide.enabled"></div>
		</div>
		<p class="muted" style="font-size: 12px; margin-top: 8px">
			{{ lang === 'en' ? 'Also uses Modrinth setting “hide on process start” if you save below.' : 'Также можно включить «Скрывать лаунчер при запуске» в блоке Лаунчер ниже и нажать Сохранить.' }}
		</p>
	</section>


	<!-- Mini mode -->
	<section class="card section">
		<h3>{{ lang === 'en' ? 'Mini mode' : 'Мини-режим' }}</h3>
		<div class="setrow">
			<div>
				<div>{{ lang === 'en' ? 'Compact widget window' : 'Компактное окно-виджет' }}</div>
				<div class="d">{{ lang === 'en' ? 'Only Play buttons (toggle also in title bar)' : 'Только кнопки «Играть» (также кнопка в заголовке окна)' }}</div>
			</div>
			<div class="toggle" :class="{ on: miniMode.enabled }" @click="miniMode.enabled = !miniMode.enabled"></div>
		</div>
		<div v-if="miniMode.enabled" class="setrow">
			<div><div>{{ lang === 'en' ? 'Favorites only' : 'Только избранные' }}</div></div>
			<div class="toggle" :class="{ on: miniMode.favoritesOnly }" @click="miniMode.favoritesOnly = !miniMode.favoritesOnly"></div>
		</div>
	</section>

	<!-- Discord -->
	<section class="card section">
		<h3>Discord Rich Presence</h3>
		<div class="setrow">
			<div>
				<div>{{ lang === 'en' ? 'Show activity in Discord' : 'Показывать активность в Discord' }}</div>
				<div class="d">Nova · Fabric 1.21 · имя сборки (заголовок окна + RPC, если ядро поддерживает)</div>
			</div>
			<div class="toggle" :class="{ on: discordRpc.enabled }" @click="discordRpc.enabled = !discordRpc.enabled"></div>
		</div>
	</section>
	<!-- Sounds -->
	<section class="card section">
		<h3>{{ lang === 'en' ? 'UI sounds' : 'Звуки интерфейса' }}</h3>
		<div class="setrow">
			<div><div>{{ lang === 'en' ? 'Enable sounds' : 'Включить звуки' }}</div></div>
			<div class="toggle" :class="{ on: sounds.enabled }" @click="sounds.enabled = !sounds.enabled"></div>
		</div>
		<template v-if="sounds.enabled">
			<div class="setrow">
				<div><div>{{ lang === 'en' ? 'Click' : 'Клик' }}</div></div>
				<div class="toggle" :class="{ on: sounds.click }" @click="sounds.click = !sounds.click"></div>
			</div>
			<div class="setrow">
				<div><div>{{ lang === 'en' ? 'Launch' : 'Запуск игры' }}</div></div>
				<div class="toggle" :class="{ on: sounds.launch }" @click="sounds.launch = !sounds.launch"></div>
			</div>
			<label class="field">
				{{ lang === 'en' ? 'Volume' : 'Громкость' }}: <b style="color: var(--text)">{{ Math.round(sounds.volume * 100) }}%</b>
				<input v-model.number="sounds.volume" type="range" min="0" max="1" step="0.05" />
			</label>
			<div class="row" style="gap: 8px">
				<button class="btn ghost" @click="playClick">{{ lang === 'en' ? 'Test click' : 'Тест клика' }}</button>
				<button class="btn ghost" @click="playLaunchSound">{{ lang === 'en' ? 'Test launch' : 'Тест запуска' }}</button>
			</div>
		</template>
	</section>

	<!-- Seasonal -->
	<section class="card section">
		<h3>{{ lang === 'en' ? 'Seasonal themes' : 'Сезонные темы' }}</h3>
		<div class="setrow">
			<div>
				<div>{{ lang === 'en' ? 'Auto seasonal theme' : 'Автосмена по сезону' }}</div>
				<div class="d">Halloween · New Year · Summer</div>
			</div>
			<div class="toggle" :class="{ on: seasonal.enabled }" @click="seasonal.enabled = !seasonal.enabled"></div>
		</div>
		<template v-if="seasonal.enabled">
			<label class="field">
				Halloween (20.10–02.11)
				<select v-model="seasonal.halloween" class="select">
					<option v-for="th in allThemes" :key="th.id" :value="th.id">{{ th.name }}</option>
				</select>
			</label>
			<label class="field">
				{{ lang === 'en' ? 'New Year (20.12–10.01)' : 'Новый год (20.12–10.01)' }}
				<select v-model="seasonal.newyear" class="select">
					<option v-for="th in allThemes" :key="th.id" :value="th.id">{{ th.name }}</option>
				</select>
			</label>
			<label class="field">
				{{ lang === 'en' ? 'Summer (Jun–Aug)' : 'Лето (июнь–август)' }}
				<select v-model="seasonal.summer" class="select">
					<option v-for="th in allThemes" :key="th.id" :value="th.id">{{ th.name }}</option>
				</select>
			</label>
		</template>
	</section>

	<!-- History -->
	<section v-if="!(streamer.enabled && streamer.hideHistory)" class="card section">
		<div class="row" style="justify-content: space-between; margin-bottom: 12px">
			<h3 style="margin: 0">{{ t('history') }}</h3>
			<button v-if="launchHistory.length" class="btn ghost" style="font-size: 12px" @click="clearHistory">
				{{ lang === 'en' ? 'Clear' : 'Очистить' }}
			</button>
		</div>
		<div v-if="!launchHistory.length" class="muted">{{ t('noHistory') }}</div>
		<div v-else class="hist-list">
			<button
				v-for="(h, i) in launchHistory.slice(0, 15)"
				:key="i"
				class="hist-row"
				@click="openInstance(h.instanceId)"
			>
				<span class="hist-name">{{ h.name }}</span>
				<span class="muted" style="font-size: 12px">{{ formatAgo(h.at) }}</span>
			</button>
		</div>
	</section>

	<!-- Streamer -->
	<section class="card section">
		<h3>{{ t('streamerMode') }}</h3>
		<div class="setrow">
			<div>
				<div>{{ t('enableStreamer') }}</div>
				<div class="d">{{ lang === 'en' ? 'Choose what to hide while streaming' : 'Выберите, что скрывать на стриме' }}</div>
			</div>
			<div class="toggle" :class="{ on: streamer.enabled }" @click="streamer.enabled = !streamer.enabled"></div>
		</div>
		<template v-if="streamer.enabled">
			<div class="setrow">
				<div><div>{{ t('hideNickname') }}</div></div>
				<div class="toggle" :class="{ on: streamer.hideNickname }" @click="streamer.hideNickname = !streamer.hideNickname"></div>
			</div>
			<div class="setrow">
				<div><div>{{ t('hideToasts') }}</div></div>
				<div class="toggle" :class="{ on: streamer.hideToasts }" @click="streamer.hideToasts = !streamer.hideToasts"></div>
			</div>
			<div class="setrow">
				<div><div>{{ t('compactWindow') }}</div></div>
				<div class="toggle" :class="{ on: streamer.compactWindow }" @click="streamer.compactWindow = !streamer.compactWindow"></div>
			</div>
			<div class="setrow">
				<div><div>{{ t('blurAvatars') }}</div></div>
				<div class="toggle" :class="{ on: streamer.blurAvatars }" @click="streamer.blurAvatars = !streamer.blurAvatars"></div>
			</div>
			<div class="setrow">
				<div><div>{{ t('hideAccountDetails') }}</div></div>
				<div class="toggle" :class="{ on: streamer.hideAccountDetails }" @click="streamer.hideAccountDetails = !streamer.hideAccountDetails"></div>
			</div>
			<div class="setrow">
				<div><div>{{ lang === 'en' ? 'Hide playtime on cards' : 'Скрыть наигранное на карточках' }}</div></div>
				<div class="toggle" :class="{ on: streamer.hidePlaytime }" @click="streamer.hidePlaytime = !streamer.hidePlaytime"></div>
			</div>
			<div class="setrow">
				<div><div>{{ lang === 'en' ? 'Hide launch history' : 'Скрыть историю запусков' }}</div></div>
				<div class="toggle" :class="{ on: streamer.hideHistory }" @click="streamer.hideHistory = !streamer.hideHistory"></div>
			</div>
		</template>
	</section>

	<!-- Live bg -->
	<section class="card section">
		<h3>{{ t('liveBg') }}</h3>
		<div class="setrow">
			<div>
				<div>{{ t('enableLiveBg') }}</div>
			</div>
			<div class="toggle" :class="{ on: liveBg.enabled }" @click="liveBg.enabled = !liveBg.enabled"></div>
		</div>
		<template v-if="liveBg.enabled">
			<label class="field">
				{{ t('bgPreset') }}
				<select v-model="liveBg.kind" class="select">
					<option v-for="k in liveKinds" :key="k.id" :value="k.id">{{ t(k.labelKey) }}</option>
				</select>
			</label>
			<template v-if="liveBg.kind === 'image'">
				<label class="field">
					{{ t('customBg') }}
					<input v-model="liveBg.customImage" class="input" placeholder="https://… or data:image/…" />
				</label>
				<div class="muted" style="font-size: 12px; margin-bottom: 8px">
					{{ lang === 'en' ? 'Or pick a preset:' : 'Или выберите пресет:' }}
				</div>
				<div class="row" style="gap: 8px; flex-wrap: wrap; margin-bottom: 12px">
					<button
						v-for="p in BG_IMAGE_PRESETS"
						:key="p.id"
						class="btn ghost"
						style="font-size: 12px"
						@click="pickPreset(p.url)"
					>
						{{ p.label }}
					</button>
				</div>
				<label class="field">
					{{ lang === 'en' ? 'Dim' : 'Затемнение' }}: <b style="color: var(--text)">{{ liveBg.dim.toFixed(2) }}</b>
					<input v-model.number="liveBg.dim" type="range" min="0" max="0.85" step="0.05" />
				</label>
			</template>
			<template v-else-if="liveBg.kind !== 'none'">
				<label class="field">
					{{ t('intensity') }}: <b style="color: var(--text)">{{ liveBg.intensity.toFixed(2) }}</b>
					<input v-model.number="liveBg.intensity" type="range" min="0.2" max="1.5" step="0.05" />
				</label>
				<label class="field">
					{{ t('speed') }}: <b style="color: var(--text)">{{ liveBg.speed.toFixed(2) }}</b>
					<input v-model.number="liveBg.speed" type="range" min="0.3" max="2" step="0.05" />
				</label>
			</template>
		</template>
	</section>

	<!-- Auto theme -->
	<section class="card section">
		<h3>{{ t('autoTheme') }}</h3>
		<div class="setrow">
			<div>
				<div>{{ t('autoTheme') }}</div>
			</div>
			<div class="toggle" :class="{ on: autoTheme.enabled }" @click="autoTheme.enabled = !autoTheme.enabled"></div>
		</div>
		<template v-if="autoTheme.enabled">
			<label class="field">
				{{ t('morning') }}
				<select v-model="autoTheme.morning" class="select">
					<option v-for="th in allThemes" :key="th.id" :value="th.id">{{ th.name }}</option>
				</select>
			</label>
			<label class="field">
				{{ t('day') }}
				<select v-model="autoTheme.day" class="select">
					<option v-for="th in allThemes" :key="th.id" :value="th.id">{{ th.name }}</option>
				</select>
			</label>
			<label class="field">
				{{ t('evening') }}
				<select v-model="autoTheme.evening" class="select">
					<option v-for="th in allThemes" :key="th.id" :value="th.id">{{ th.name }}</option>
				</select>
			</label>
			<label class="field">
				{{ t('night') }}
				<select v-model="autoTheme.night" class="select">
					<option v-for="th in allThemes" :key="th.id" :value="th.id">{{ th.name }}</option>
				</select>
			</label>
		</template>
	</section>

	<template v-if="s">
		<section class="card section">
			<h3>{{ t('memory') }}</h3>
			<label class="field">
				Max RAM: <b style="color: var(--text)">{{ s.memory.maximum }} MB</b>
				<input v-model.number="s.memory.maximum" type="range" min="1024" max="32768" step="512" />
			</label>
			<label class="field">
				JVM args
				<input v-model="args" class="input mono" placeholder="-XX:+UseG1GC" />
			</label>
		</section>
		<section class="card section">
			<h3>{{ t('gameWindow') }}</h3>
			<div class="setrow">
				<div><div>Fullscreen</div></div>
				<div class="toggle" :class="{ on: s.force_fullscreen }" @click="s.force_fullscreen = !s.force_fullscreen"></div>
			</div>
			<div class="row">
				<label class="field" style="flex: 1">W<input v-model.number="s.game_resolution[0]" class="input" type="number" min="320" /></label>
				<label class="field" style="flex: 1">H<input v-model.number="s.game_resolution[1]" class="input" type="number" min="240" /></label>
			</div>
		</section>
		<section class="card section">
			<h3>{{ t('launcher') }}</h3>
			<div class="setrow">
				<div><div>{{ lang === 'en' ? 'Hide launcher on game start' : 'Скрывать лаунчер при запуске' }}</div></div>
				<div class="toggle" :class="{ on: s.hide_on_process_start }" @click="s.hide_on_process_start = !s.hide_on_process_start"></div>
			</div>
			<label class="field">
				Downloads: <b style="color: var(--text)">{{ s.max_concurrent_downloads }}</b>
				<input v-model.number="s.max_concurrent_downloads" type="range" min="1" max="32" />
			</label>
		</section>
	</template>
	<div v-else class="empty card">…</div>
</template>

<style scoped>
.hist-list { display: flex; flex-direction: column; gap: 4px; max-height: 280px; overflow: auto; }
.hist-row {
	display: flex; justify-content: space-between; align-items: center; gap: 12px;
	padding: 8px 10px; border: 0; border-radius: var(--radius-sm);
	background: transparent; color: var(--text); cursor: pointer; text-align: left;
}
.hist-row:hover { background: var(--surface-2); }
.hist-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
