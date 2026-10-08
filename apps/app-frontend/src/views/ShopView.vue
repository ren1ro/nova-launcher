<script setup lang="ts">
import {
	ACHIEVEMENTS,
	SHOP_ITEMS,
	buyItem,
	equipItem,
	equipped,
	hasItem,
	owned,
	sparks,
	streak,
	titleLabel,
	unlockedAchs,
} from '../core/economy'
import { lang, t } from '../core/features'
import { toast } from '../core/store'
import Icon from '../components/Icon.vue'

function buy(id: string) {
	const r = buyItem(id)
	if (r.ok) toast(lang.value === 'en' ? 'Purchased!' : 'Куплено!', 'success')
	else if (r.msg === 'no_money') toast(t('notEnough'), 'error')
	else if (r.msg === 'owned') toast(t('owned'), 'info')
}

function equip(slot: string, id: string) {
	equipItem(slot, id)
	toast(t('equipped'), 'success')
}

const titles = SHOP_ITEMS.filter((i) => i.slot === 'title')
const cos = SHOP_ITEMS.filter((i) => i.slot === 'gameover' || i.slot === 'win_sound')
const modes = SHOP_ITEMS.filter((i) => i.slot === 'mode')
const secrets = SHOP_ITEMS.filter((i) => i.secret)
</script>

<template>
	<div class="page-head">
		<div>
			<h1>{{ t('shop') }}</h1>
			<p>
				<span class="spark-pill">✦ {{ sparks }} {{ t('sparks') }}</span>
				<span class="muted" style="margin-left: 12px">🔥 {{ streak.count }}</span>
			</p>
		</div>
	</div>

	<section class="card section">
		<h3>{{ lang === 'en' ? 'Titles' : 'Титулы' }}</h3>
		<div class="shop-grid">
			<div v-for="it in titles" :key="it.id" class="shop-card">
				<div class="shop-name">{{ t(it.nameKey) }}</div>
				<div class="muted" style="font-size: 12px">{{ t(it.descKey) }}</div>
				<div class="shop-foot">
					<span class="price">✦ {{ it.price }}</span>
					<button v-if="!hasItem(it.id)" class="btn" :disabled="sparks < it.price" @click="buy(it.id)">{{ t('buy') }}</button>
					<button
						v-else
						class="btn ghost"
						:class="{ on: equipped.title === it.id }"
						@click="equip('title', it.id)"
					>
						{{ equipped.title === it.id ? t('equipped') : t('equip') }}
					</button>
				</div>
			</div>
		</div>
	</section>

	<section class="card section">
		<h3>{{ lang === 'en' ? 'Tetris cosmetics' : 'Косметика Tetris' }}</h3>
		<div class="shop-grid">
			<div v-for="it in cos" :key="it.id" class="shop-card">
				<div class="shop-name">{{ t(it.nameKey) }}</div>
				<div class="muted" style="font-size: 12px">{{ t(it.descKey) }}</div>
				<div class="shop-foot">
					<span class="price">✦ {{ it.price }}</span>
					<button v-if="!hasItem(it.id)" class="btn" :disabled="sparks < it.price" @click="buy(it.id)">{{ t('buy') }}</button>
					<button
						v-else
						class="btn ghost"
						:class="{ on: equipped[it.slot] === it.id }"
						@click="equip(it.slot, it.id)"
					>
						{{ equipped[it.slot] === it.id ? t('equipped') : t('equip') }}
					</button>
				</div>
			</div>
		</div>
	</section>

	<section class="card section">
		<h3>{{ lang === 'en' ? 'Extra Tetris modes' : 'Режимы Tetris' }}</h3>
		<div class="shop-grid">
			<div v-for="it in modes" :key="it.id" class="shop-card">
				<div class="shop-name">{{ t(it.nameKey) }}</div>
				<div class="muted" style="font-size: 12px">{{ t(it.descKey) }}</div>
				<div class="shop-foot">
					<span class="price">✦ {{ it.price }}</span>
					<button v-if="!hasItem(it.id)" class="btn" :disabled="sparks < it.price" @click="buy(it.id)">{{ t('buy') }}</button>
					<span v-else class="badge ok">{{ t('owned') }}</span>
				</div>
			</div>
		</div>
	</section>

	<section class="card section">
		<h3>✦✦✦</h3>
		<div class="shop-grid">
			<div v-for="it in secrets" :key="it.id" class="shop-card secret">
				<div class="shop-name">{{ t(it.nameKey) }}</div>
				<div class="muted" style="font-size: 12px">{{ t(it.descKey) }}</div>
				<div class="shop-foot">
					<span class="price">✦ {{ it.price }}</span>
					<button v-if="!hasItem(it.id)" class="btn" :disabled="sparks < it.price" @click="buy(it.id)">{{ t('buy') }}</button>
					<span v-else class="badge ok">{{ t('owned') }}</span>
				</div>
			</div>
		</div>
	</section>

	<section class="card section">
		<h3>{{ t('showcase') }} — {{ t('achievements') }} ({{ unlockedAchs.length }}/{{ ACHIEVEMENTS.length }})</h3>
		<div class="ach-grid">
			<div
				v-for="a in ACHIEVEMENTS"
				:key="a.id"
				class="ach-card"
				:class="{ locked: !unlockedAchs.includes(a.id) }"
			>
				<div class="ach-ico">{{ a.icon }}</div>
				<div>
					<div class="shop-name">{{ unlockedAchs.includes(a.id) ? t(a.nameKey) : '???' }}</div>
					<div class="muted" style="font-size: 12px">
						{{ unlockedAchs.includes(a.id) ? t(a.descKey) : '•••' }}
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.spark-pill {
	display: inline-block;
	padding: 4px 10px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--accent) 20%, transparent);
	color: var(--accent);
	font-weight: 700;
	font-size: 13px;
}
.shop-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: 12px;
}
.shop-card {
	padding: 14px;
	border-radius: var(--radius-sm);
	border: 1px solid var(--border);
	background: var(--surface-2);
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.shop-card.secret {
	border-color: color-mix(in srgb, gold 40%, var(--border));
	box-shadow: 0 0 20px color-mix(in srgb, gold 15%, transparent);
}
.shop-name { font-weight: 700; }
.shop-foot {
	margin-top: auto;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding-top: 8px;
}
.price { font-weight: 700; color: var(--accent); font-size: 13px; }
.btn.on { border-color: var(--accent); color: var(--accent); }
.ach-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 10px;
}
.ach-card {
	display: flex;
	gap: 12px;
	align-items: center;
	padding: 12px;
	border-radius: var(--radius-sm);
	border: 1px solid var(--border);
	background: var(--surface-2);
}
.ach-card.locked { opacity: 0.45; filter: grayscale(0.8); }
.ach-ico { font-size: 22px; width: 36px; text-align: center; }
</style>
