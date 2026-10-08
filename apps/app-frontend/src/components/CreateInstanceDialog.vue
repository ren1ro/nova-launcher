<script setup lang="ts">
import { open } from '@tauri-apps/plugin-dialog'
import { computed, onMounted, ref, watch } from 'vue'

import * as api from '../core/api'
import { toast, trackJob, notifyInstanceCreated } from '../core/store'
import Icon from './Icon.vue'

const emit = defineEmits<{ close: [] }>()

const tab = ref<'new' | 'file'>('new')
const name = ref('')
const loader = ref<api.Loader>('fabric')
const loaders: api.Loader[] = ['vanilla', 'fabric', 'forge', 'neoforge', 'quilt']
const showSnapshots = ref(false)
const gameVersion = ref('')
const loaderVersion = ref('')
const busy = ref(false)
const loadingMeta = ref(true)

const manifest = ref<{ latest: { release: string; snapshot: string }; versions: api.GameVersionEntry[] } | null>(null)
const supported = ref<Set<string> | null>(null)
const loaderVersions = ref<{ id: string; stable: boolean }[]>([])

const versions = computed(() => {
	const all = manifest.value?.versions ?? []
	const list = showSnapshots.value ? all : all.filter((v) => v.type === 'release')
	if (loader.value !== 'vanilla' && supported.value) {
		const ok = supported.value
		return list.filter((v) => ok.has(v.id))
	}
	return list
})

onMounted(async () => {
	try {
		manifest.value = await api.getGameVersions()
		gameVersion.value = manifest.value.latest.release
		await loadLoader()
	} catch (e) {
		toast(`Не удалось загрузить список версий (нужен интернет): ${api.errMsg(e)}`, 'error', 8000)
	} finally {
		loadingMeta.value = false
	}
})

async function loadLoader() {
	supported.value = null
	loaderVersions.value = []
	if (loader.value === 'vanilla') return
	try {
		supported.value = await api.getSupportedGameVersions(loader.value)
		await loadLoaderVersions()
	} catch (e) {
		toast(`Не удалось загрузить версии ${loader.value}: ${api.errMsg(e)}`, 'error')
	}
}

async function loadLoaderVersions() {
	if (loader.value === 'vanilla' || !gameVersion.value) {
		loaderVersions.value = []
		return
	}
	try {
		loaderVersions.value = await api.getLoaderVersions(loader.value, gameVersion.value)
	} catch {
		loaderVersions.value = []
	}
}

watch(gameVersion, loadLoaderVersions)
watch(loader, async () => {
	loadingMeta.value = true
	await loadLoader()
	loadingMeta.value = false
})

// подбираем актуальные значения при смене загрузчика/версии игры
watch([versions, loaderVersions], () => {
	if (versions.value.length && !versions.value.some((v) => v.id === gameVersion.value)) {
		gameVersion.value = versions.value[0].id
	}
	const lv = loaderVersions.value
	if (lv.length && !lv.some((v) => v.id === loaderVersion.value)) {
		loaderVersion.value = (lv.find((v) => v.stable) ?? lv[0]).id
	}
	if (!lv.length) loaderVersion.value = ''
})

async function create() {
	if (!name.value.trim()) return toast('Введите название сборки', 'error')
	if (!gameVersion.value) return toast('Выберите версию Minecraft', 'error')
	if (loader.value !== 'vanilla' && !loaderVersion.value) return toast('Нет версии загрузчика для этой версии игры', 'error')
	busy.value = true
	try {
		const job = await api.createInstance({
			name: name.value.trim(),
			gameVersion: gameVersion.value,
			loader: loader.value,
			loaderVersion: loader.value === 'vanilla' ? null : loaderVersion.value,
		})
		trackJob(job)
		void notifyInstanceCreated()
		toast(`Сборка «${name.value.trim()}» создаётся…`, 'info')
		emit('close')
	} catch (e) {
		toast(`Не удалось создать сборку: ${api.errMsg(e)}`, 'error', 8000)
	} finally {
		busy.value = false
	}
}

async function fromFile() {
	try {
		const picked = await open({
			multiple: false,
			filters: [{ name: 'Модпак Modrinth (.mrpack)', extensions: ['mrpack'] }],
		})
		if (!picked) return
		const path = typeof picked === 'string' ? picked : (picked as { path: string }).path
		busy.value = true
		const job = await api.createModpackFromFile(path)
		trackJob(job)
		void notifyInstanceCreated()
		toast('Модпак устанавливается…', 'info')
		emit('close')
	} catch (e) {
		toast(`Не удалось установить модпак: ${api.errMsg(e)}`, 'error', 8000)
	} finally {
		busy.value = false
	}
}
</script>

<template>
	<div class="modal-back" @click.self="emit('close')">
		<div class="card modal">
			<div class="row between">
				<h2>Новая сборка</h2>
				<button class="iconbtn" @click="emit('close')"><Icon name="close" /></button>
			</div>

			<div class="seg" style="align-self: flex-start">
				<button :class="{ on: tab === 'new' }" @click="tab = 'new'">Создать с нуля</button>
				<button :class="{ on: tab === 'file' }" @click="tab = 'file'">Из файла .mrpack</button>
			</div>

			<template v-if="tab === 'new'">
				<label class="field">Название
					<input v-model="name" class="input" placeholder="Моя сборка" autofocus @keyup.enter="create" />
				</label>
				<div class="field">Загрузчик
					<div class="seg" style="flex-wrap: wrap">
						<button v-for="l in loaders" :key="l" :class="{ on: loader === l }" @click="loader = l">{{ l }}</button>
					</div>
				</div>
				<div class="row wrap" style="align-items: flex-end">
					<label class="field" style="flex: 1; min-width: 160px">Версия Minecraft
						<select v-model="gameVersion" class="select" :disabled="loadingMeta">
							<option v-for="v in versions" :key="v.id" :value="v.id">{{ v.id }}</option>
						</select>
					</label>
					<label v-if="loader !== 'vanilla'" class="field" style="flex: 1; min-width: 160px">Версия {{ loader }}
						<select v-model="loaderVersion" class="select" :disabled="loadingMeta">
							<option v-for="v in loaderVersions" :key="v.id" :value="v.id">{{ v.id }}{{ v.stable ? '' : ' (нестабильная)' }}</option>
						</select>
					</label>
				</div>
				<div class="setrow">
					<div class="d muted">Показывать снапшоты</div>
					<div class="toggle" :class="{ on: showSnapshots }" @click="showSnapshots = !showSnapshots"></div>
				</div>
				<div class="row" style="justify-content: flex-end">
					<button class="btn ghost" @click="emit('close')">Отмена</button>
					<button class="btn" :disabled="busy || loadingMeta" @click="create"><Icon name="plus" />Создать</button>
				</div>
			</template>

			<template v-else>
				<p class="muted" style="margin: 0">
					Выберите файл модпака <code>.mrpack</code> (экспорт из Modrinth или скачанный с modrinth.com). Моды и настройки
					будут установлены автоматически.
				</p>
				<div class="row" style="justify-content: flex-end">
					<button class="btn ghost" @click="emit('close')">Отмена</button>
					<button class="btn" :disabled="busy" @click="fromFile"><Icon name="folder" />Выбрать файл…</button>
				</div>
			</template>
		</div>
	</div>
</template>
