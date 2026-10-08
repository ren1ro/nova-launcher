<script setup lang="ts">
import { computed, ref } from 'vue'

import CreateInstanceDialog from '../components/CreateInstanceDialog.vue'
import Icon from '../components/Icon.vue'
import InstanceCard from '../components/InstanceCard.vue'
import {
	COLOR_PRESETS,
	addGroup,
	groups,
	instanceGroup,
	randomBusy,
	randomLocalInstance,
	randomModpackPlay,
	removeGroup,
	t,
} from '../core/features'
import {
	favorites,
	instances,
	play,
	refreshInstances,
	running,
	toast,
	trackJob,
} from '../core/store'

const creating = ref(false)
const q = ref('')
const loader = ref('all')
const sort = ref<'played' | 'name' | 'created' | 'time'>('played')
const onlyFav = ref(false)
const groupFilter = ref<string>('all')
const layout = ref<'grid' | 'list'>((localStorage.getItem('nova.layout') as 'grid' | 'list') || 'grid')
const manageGroups = ref(false)
const newGroupName = ref('')
const newGroupColor = ref(COLOR_PRESETS[6])
const randomMenu = ref(false)

function setLayout(l: 'grid' | 'list') {
	layout.value = l
	localStorage.setItem('nova.layout', l)
}

const loaders = computed(() => ['all', ...new Set(instances.value.map((i) => i.loader))])

const shown = computed(() => {
	const s = q.value.trim().toLowerCase()
	let list = instances.value.filter(
		(i) =>
			(!s || i.name.toLowerCase().includes(s) || i.game_version.includes(s)) &&
			(loader.value === 'all' || i.loader === loader.value) &&
			(!onlyFav.value || favorites.value.includes(i.id)) &&
			(groupFilter.value === 'all' ||
				(groupFilter.value === 'none'
					? !instanceGroup.value[i.id]
					: instanceGroup.value[i.id] === groupFilter.value)),
	)
	const t = (d?: string | null) => (d ? new Date(d).getTime() : 0)
	list = [...list].sort((a, b) => {
		const ra = running[a.id] ? 1 : 0,
			rb = running[b.id] ? 1 : 0
		if (ra !== rb) return rb - ra
		const fa = favorites.value.includes(a.id) ? 1 : 0,
			fb = favorites.value.includes(b.id) ? 1 : 0
		if (fa !== fb) return fb - fa
		if (sort.value === 'name') return a.name.localeCompare(b.name)
		if (sort.value === 'created') return t(b.created) - t(a.created)
		if (sort.value === 'time') return b.submitted_time_played - a.submitted_time_played
		return t(b.last_played) - t(a.last_played)
	})
	return list
})

async function onRandomLocal() {
	randomMenu.value = false
	const inst = randomLocalInstance(instances.value, favorites.value)
	if (!inst) {
		toast('Нет готовых  для случайного запуска', 'error')
		return
	}
	toast(`Случайный выбор: «${inst.name}»`, 'info')
	await play(inst)
}

async function onRandomModpack() {
	randomMenu.value = false
	try {
		await randomModpackPlay(trackJob, toast)
	} catch {
		/* toasted inside */
	}
}

function createGroup() {
	const name = newGroupName.value.trim()
	if (!name) return
	addGroup(name, newGroupColor.value)
	newGroupName.value = ''
	toast(`Группа «${name}» создана`, 'success')
}
</script>

<template>
	<div class="page-head">
		<div>
			<h1>{{ t('library') }}</h1>
			<p>{{ instances.length }} {{ t('librarySub') }}</p>
		</div>
		<div class="row" style="flex-wrap: wrap">
			<div class="random-wrap">
				<button class="btn ghost" :disabled="randomBusy" @click="randomMenu = !randomMenu">
					<Icon name="play" />{{ t('whatToPlay') }}
				</button>
				<div v-if="randomMenu" class="random-menu card">
					<button class="menu-item" @click="onRandomLocal">
						<span>{{ t('randomLocal') }}</span>
						<small>{{ t('randomLocal') }}</small>
					</button>
					<button class="menu-item" :disabled="randomBusy" @click="onRandomModpack">
						<span>{{ randomBusy ? '…' : t('randomModpack') }}</span>
						<small>{{ t('randomModpack') }}</small>
					</button>
				</div>
			</div>
			<button class="btn ghost" @click="manageGroups = !manageGroups">
				<Icon name="grid" />{{ t('groups') }}
			</button>
			<button class="btn ghost" @click="refreshInstances"><Icon name="refresh" />{{ t('refresh') }}</button>
			<button class="btn" @click="creating = true"><Icon name="plus" />{{ t('createInstance') }}</button>
		</div>
	</div>

	<section v-if="manageGroups" class="card section groups-panel">
		<div class="row" style="justify-content: space-between; margin-bottom: 12px">
			<h3 style="margin: 0">{{ t('groups') }}</h3>
			<button class="btn ghost" @click="manageGroups = false">×</button>
		</div>
		<div class="group-list">
			<div v-for="g in groups" :key="g.id" class="group-row">
				<span class="color-dot" :style="{ background: g.color }"></span>
				<span class="group-name">{{ g.name }}</span>
				<span class="muted" style="font-size: 12px">
					{{ Object.values(instanceGroup).filter((x) => x === g.id).length }} 
				</span>
				<button class="iconbtn" title="Удалить группу" @click="removeGroup(g.id)">×</button>
			</div>
		</div>
		<div class="row" style="margin-top: 12px; gap: 8px; flex-wrap: wrap">
			<input v-model="newGroupName" class="input" placeholder="Название группы" style="flex: 1; min-width: 140px" />
			<div class="color-picks">
				<button
					v-for="c in COLOR_PRESETS"
					:key="c"
					class="color-pick"
					:class="{ on: newGroupColor === c }"
					:style="{ background: c }"
					@click="newGroupColor = c"
				/>
			</div>
			<button class="btn" @click="createGroup">Добавить</button>
		</div>
		<p class="muted" style="font-size: 12px; margin-top: 10px">
			Назначить группу/цвет можно на карточке сборки (кнопка метки).
		</p>
	</section>

	<div class="toolbar">
		<input v-model="q" class="input" :placeholder="t('search')" />
		<select v-model="loader" class="select">
			<option v-for="l in loaders" :key="l" :value="l">{{ l === 'all' ? t('allLoaders') : l }}</option>
		</select>
		<select v-model="groupFilter" class="select">
			<option value="all">{{ t('allGroups') }}</option>
			<option value="none">{{ t('noGroupFilter') }}</option>
			<option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
		</select>
		<select v-model="sort" class="select">
			<option value="played">{{ t('recentlyPlayed') }}</option>
			<option value="name">По имени</option>
			<option value="created">Новые</option>
			<option value="time">По времени игры</option>
		</select>
		<button
			class="btn ghost"
			:style="onlyFav ? 'border-color:var(--accent-2);color:var(--accent-2)' : ''"
			@click="onlyFav = !onlyFav"
		>
			<Icon name="star" />{{ t('favorites') }}
		</button>
		<div class="seg" style="margin-left: auto">
			<button :class="{ on: layout === 'grid' }" title="Плитки" @click="setLayout('grid')">
				<Icon name="grid" style="width: 16px" />
			</button>
			<button :class="{ on: layout === 'list' }" title="Список" @click="setLayout('list')">
				<Icon name="list" style="width: 16px" />
			</button>
		</div>
	</div>

	<div v-if="shown.length" class="grid" :class="{ list: layout === 'list' }">
		<InstanceCard v-for="(i, n) in shown" :key="i.id" :inst="i" :delay="Math.min(n, 12) * 30" />
	</div>
	<div v-else class="empty card">
		<h3>{{ instances.length ? 'Ничего не найдено' : 'Сборок пока нет' }}</h3>
		<p v-if="!instances.length">
			Лаунчер использует папку данных Modrinth App (<code>%APPDATA%\ModrinthApp</code>). Если вы создавали сборки в
			оригинальном приложении, они появятся здесь автоматически.
		</p>
		<p v-else>Измените поисковый запрос или фильтры.</p>
	</div>
	<CreateInstanceDialog v-if="creating" @close="creating = false" />
</template>

<style scoped>
.random-wrap { position: relative; }
.random-menu {
	position: absolute; top: calc(100% + 6px); right: 0; z-index: 40;
	min-width: 260px; padding: 6px; display: flex; flex-direction: column; gap: 2px;
	box-shadow: 0 12px 40px rgba(0,0,0,.35);
}
.menu-item {
	display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
	padding: 10px 12px; border: 0; background: transparent; border-radius: var(--radius-sm);
	cursor: pointer; color: var(--text); text-align: left;
}
.menu-item:hover { background: var(--surface-2); }
.menu-item small { color: var(--text-dim); font-size: 11px; }
.groups-panel { margin-bottom: 16px; }
.group-list { display: flex; flex-direction: column; gap: 6px; }
.group-row {
	display: flex; align-items: center; gap: 10px; padding: 6px 8px;
	border-radius: var(--radius-sm); background: var(--surface-2);
}
.color-dot { width: 14px; height: 14px; border-radius: 50%; flex: none; }
.group-name { font-weight: 600; flex: 1; }
.color-picks { display: flex; gap: 4px; flex-wrap: wrap; }
.color-pick {
	width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent;
	cursor: pointer; padding: 0;
}
.color-pick.on { border-color: var(--text); box-shadow: 0 0 0 2px var(--bg); }
</style>
