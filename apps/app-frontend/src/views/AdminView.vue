<script setup lang="ts">
import { ref } from 'vue'

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
import { toast } from '../core/store'

const pass = ref('')
const amount = ref(1000)
const setTo = ref(0)
const err = ref(false)

function login() {
	err.value = false
	if (tryAdminLogin(pass.value)) {
		toast(lang.value === 'en' ? 'Admin unlocked' : 'Админ-доступ открыт', 'success')
		pass.value = ''
	} else {
		err.value = true
		toast(lang.value === 'en' ? 'Wrong password' : 'Неверный пароль', 'error')
	}
}

function grant() {
	adminGrantSparks(amount.value)
	toast(`+${amount.value} ✦`, 'success')
}
function setBal() {
	adminSetSparks(setTo.value)
	toast(`= ${setTo.value} ✦`, 'success')
}
</script>

<template>
	<div class="page-head">
		<div>
			<h1>{{ lang === 'en' ? 'Admin' : 'Админ' }}</h1>
			<p class="muted">{{ lang === 'en' ? 'Local debug tools' : 'Локальные инструменты' }}</p>
		</div>
	</div>

	<section v-if="!adminUnlocked" class="card section" style="max-width: 360px">
		<label class="field">
			{{ lang === 'en' ? 'Password' : 'Пароль' }}
			<input
				v-model="pass"
				class="input"
				type="password"
				autocomplete="off"
				@keyup.enter="login"
			/>
		</label>
		<p v-if="err" style="color: var(--danger); font-size: 13px">
			{{ lang === 'en' ? 'Access denied' : 'Доступ запрещён' }}
		</p>
		<button class="btn" @click="login">{{ lang === 'en' ? 'Unlock' : 'Войти' }}</button>
	</section>

	<template v-else>
		<section class="card section">
			<div class="row" style="justify-content: space-between">
				<div>
					<div class="muted">{{ t('sparks') }}</div>
					<div style="font-size: 28px; font-weight: 800">✦ {{ sparks }}</div>
					<div class="muted" style="font-size: 12px">
						{{ t('achievements') }}: {{ unlockedAchs.length }}/{{ ACHIEVEMENTS.length }}
					</div>
				</div>
				<button class="btn ghost" @click="adminLogout">
					{{ lang === 'en' ? 'Lock' : 'Выйти' }}
				</button>
			</div>
		</section>

		<section class="card section">
			<h3>{{ lang === 'en' ? 'Sparks' : 'Спарки' }}</h3>
			<div class="row" style="flex-wrap: wrap; gap: 10px; align-items: flex-end">
				<label class="field" style="margin: 0">
					{{ lang === 'en' ? 'Add' : 'Выдать' }}
					<input v-model.number="amount" class="input" type="number" min="1" style="width: 120px" />
				</label>
				<button class="btn" @click="grant">+ ✦</button>
				<label class="field" style="margin: 0">
					{{ lang === 'en' ? 'Set to' : 'Установить' }}
					<input v-model.number="setTo" class="input" type="number" min="0" style="width: 120px" />
				</label>
				<button class="btn ghost" @click="setBal">=</button>
				<button class="btn ghost" @click="adminGrantSparks(9999); toast('+9999', 'success')">+9999</button>
			</div>
		</section>

		<section class="card section">
			<h3>{{ t('achievements') }}</h3>
			<div class="row" style="flex-wrap: wrap; gap: 8px">
				<button class="btn" @click="adminUnlockAllAchs(); toast(lang === 'en' ? 'All unlocked' : 'Все открыты', 'success')">
					{{ lang === 'en' ? 'Unlock all' : 'Открыть все' }}
				</button>
				<button class="btn danger" @click="adminResetAchs(); toast(lang === 'en' ? 'Achievements reset' : 'Ачивки сброшены', 'info')">
					{{ lang === 'en' ? 'Reset achievements' : 'Сбросить ачивки' }}
				</button>
			</div>
		</section>

		<section class="card section">
			<h3>{{ t('shop') }}</h3>
			<div class="row" style="flex-wrap: wrap; gap: 8px">
				<button class="btn" @click="adminUnlockAllShop(); toast(lang === 'en' ? 'Shop unlocked' : 'Магазин открыт', 'success')">
					{{ lang === 'en' ? 'Unlock all items' : 'Открыть все товары' }}
				</button>
			</div>
		</section>

		<section class="card section">
			<h3>{{ lang === 'en' ? 'Danger zone' : 'Опасная зона' }}</h3>
			<button
				class="btn danger"
				@click="adminResetEconomy(); toast(lang === 'en' ? 'Full reset' : 'Полный сброс', 'info')"
			>
				{{ lang === 'en' ? 'Reset everything (sparks, shop, achs, progress)' : 'Сбросить всё (спарки, магазин, ачивки, прогресс)' }}
			</button>
		</section>
	</template>
</template>
