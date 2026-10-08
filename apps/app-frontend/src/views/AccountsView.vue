<script setup lang="ts">
import { ref } from 'vue'

import Icon from '../components/Icon.vue'
import { errMsg, login, removeUser, setDefaultUser } from '../core/api'
import {
	ACHIEVEMENTS,
	adminGrantSparks,
	adminLogout,
	adminResetAchs,
	adminResetEconomy,
	adminSetSparks,
	adminUnlockAllAchs,
	adminUnlockAllShop,
	adminUnlocked,
	sparks,
	tryAdminLogin,
	unlockedAchs,
} from '../core/economy'
import { lang, t } from '../core/features'
import { refreshUsers, toast, users } from '../core/store'

const busy = ref(false)
const showAdmin = ref(false)
const pass = ref('')
const err = ref(false)
const amount = ref(1000)
const setTo = ref(0)

const head = (id: string) => `https://mc-heads.net/avatar/${id.replace(/-/g, '')}/96`

async function add() {
	busy.value = true
	try {
		const c = await login()
		if (c) {
			toast(`${t('loggedInAs')} ${c.profile.name}`, 'success')
			await refreshUsers()
		}
	} catch (e) {
		toast(`${t('loginError')}: ${errMsg(e)}`, 'error', 8000)
	} finally {
		busy.value = false
	}
}
async function makeDefault(id: string) {
	try {
		await setDefaultUser(id)
		await refreshUsers()
	} catch (e) {
		toast(errMsg(e), 'error')
	}
}
async function remove(id: string) {
	try {
		await removeUser(id)
		await refreshUsers()
	} catch (e) {
		toast(errMsg(e), 'error')
	}
}

function openAdmin() {
	showAdmin.value = !showAdmin.value
	err.value = false
	pass.value = ''
}

function loginAdmin() {
	err.value = false
	if (tryAdminLogin(pass.value)) {
		toast(lang.value === 'en' ? 'Admin unlocked' : 'Админ-доступ открыт', 'success')
		pass.value = ''
	} else {
		err.value = true
		toast(lang.value === 'en' ? 'Wrong password' : 'Неверный пароль', 'error')
	}
}

function lockAdmin() {
	adminLogout()
	showAdmin.value = false
}
</script>

<template>
	<div class="page-head">
		<div>
			<h1>{{ t('accounts') }}</h1>
			<p>{{ t('accountsSub') }}</p>
		</div>
		<div class="row" style="flex-wrap: wrap; gap: 8px">
			<button class="btn ghost" :class="{ on: showAdmin }" @click="openAdmin">
				{{ lang === 'en' ? 'Admin' : 'Админ' }}
			</button>
			<button class="btn" :disabled="busy" @click="add">
				<Icon name="plus" />{{ busy ? t('waitingLogin') : t('addAccount') }}
			</button>
		</div>
	</div>

	<!-- Admin panel -->
	<section v-if="showAdmin" class="card section" style="margin-bottom: 20px">
		<template v-if="!adminUnlocked">
			<h3 style="margin: 0 0 12px">{{ lang === 'en' ? 'Admin access' : 'Доступ администратора' }}</h3>
			<label class="field">
				{{ lang === 'en' ? 'Password' : 'Пароль' }}
				<input
					v-model="pass"
					class="input"
					type="password"
					autocomplete="off"
					style="max-width: 280px"
					@keyup.enter="loginAdmin"
				/>
			</label>
			<p v-if="err" style="color: var(--danger); font-size: 13px; margin: 0 0 8px">
				{{ lang === 'en' ? 'Access denied' : 'Доступ запрещён' }}
			</p>
			<button class="btn" @click="loginAdmin">{{ lang === 'en' ? 'Unlock' : 'Войти' }}</button>
		</template>

		<template v-else>
			<div class="row" style="justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px">
				<div>
					<div class="muted">{{ t('sparks') }} · {{ t('achievements') }}</div>
					<div style="font-size: 22px; font-weight: 800">✦ {{ sparks }} · {{ unlockedAchs.length }}/{{ ACHIEVEMENTS.length }}</div>
				</div>
				<button class="btn ghost" @click="lockAdmin">{{ lang === 'en' ? 'Lock' : 'Выйти' }}</button>
			</div>

			<div class="row" style="flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 12px">
				<label class="field" style="margin: 0">
					{{ lang === 'en' ? 'Add sparks' : 'Выдать спарки' }}
					<input v-model.number="amount" class="input" type="number" min="1" style="width: 120px" />
				</label>
				<button class="btn" @click="adminGrantSparks(amount); toast('+' + amount + ' ✦', 'success')">+ ✦</button>
				<label class="field" style="margin: 0">
					{{ lang === 'en' ? 'Set to' : 'Установить' }}
					<input v-model.number="setTo" class="input" type="number" min="0" style="width: 120px" />
				</label>
				<button class="btn ghost" @click="adminSetSparks(setTo); toast('= ' + setTo + ' ✦', 'success')">=</button>
				<button class="btn ghost" @click="adminGrantSparks(9999); toast('+9999', 'success')">+9999</button>
			</div>

			<div class="row" style="flex-wrap: wrap; gap: 8px">
				<button class="btn" @click="adminUnlockAllAchs(); toast(lang === 'en' ? 'All achievements' : 'Все ачивки', 'success')">
					{{ lang === 'en' ? 'Unlock all achievements' : 'Открыть все ачивки' }}
				</button>
				<button class="btn ghost" @click="adminUnlockAllShop(); toast(lang === 'en' ? 'Shop unlocked' : 'Магазин открыт', 'success')">
					{{ lang === 'en' ? 'Unlock shop' : 'Открыть магазин' }}
				</button>
				<button class="btn danger" @click="adminResetAchs(); toast(lang === 'en' ? 'Achs reset' : 'Ачивки сброшены', 'info')">
					{{ lang === 'en' ? 'Reset achievements' : 'Сбросить ачивки' }}
				</button>
				<button class="btn danger" @click="adminResetEconomy(); toast(lang === 'en' ? 'Full reset' : 'Полный сброс', 'info')">
					{{ lang === 'en' ? 'Reset all' : 'Сбросить всё' }}
				</button>
			</div>
		</template>
	</section>

	<div v-for="u in users" :key="u.profile.id" class="card acc">
		<img :src="head(u.profile.id)" alt="" />
		<div class="grow">
			<h3>{{ u.profile.name }}</h3>
			<div class="muted mono" style="font-size: 11px">{{ u.profile.id }}</div>
		</div>
		<span v-if="u.active" class="badge ok">{{ t('active') }}</span>
		<button v-else class="btn ghost" @click="makeDefault(u.profile.id)">
			<Icon name="check" />{{ t('makeDefault') }}
		</button>
		<button class="iconbtn" :title="t('delete')" @click="remove(u.profile.id)"><Icon name="trash" /></button>
	</div>

	<div v-if="!users.length" class="empty card">
		<h3>{{ t('notSignedIn') }}</h3>
		<p>{{ t('notSignedInHint') }}</p>
	</div>
</template>
