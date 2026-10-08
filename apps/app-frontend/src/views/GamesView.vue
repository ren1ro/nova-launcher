<script setup lang="ts">
import { ref } from 'vue'

import MinesGame from '../components/games/MinesGame.vue'
import SnakeGame from '../components/games/SnakeGame.vue'
import { lang } from '../core/features'
import TetrisView from './TetrisView.vue'

type GameId = 'hub' | 'tetris' | 'snake' | 'mines'

const game = ref<GameId>('hub')

const cards = [
	{ id: 'tetris' as const, icon: '🧱', nameRu: 'Tetris', nameEn: 'Tetris', descRu: 'Классика · линии · спарки', descEn: 'Classic · lines · sparks' },
	{ id: 'snake' as const, icon: '🐍', nameRu: 'Змейка', nameEn: 'Snake', descRu: 'Ешь и расти · рекорды', descEn: 'Eat and grow · high scores' },
	{ id: 'mines' as const, icon: '💣', nameRu: 'Сапёр', nameEn: 'Minesweeper', descRu: 'Найди мины · победа = бонус', descEn: 'Find mines · win = bonus' },
]
</script>

<template>
	<div v-if="game === 'hub'">
		<div class="page-head">
			<div>
				<h1>{{ lang === 'en' ? 'Games' : 'Игры' }}</h1>
				<p>
					{{
						lang === 'en'
							? 'Mini-games while packs download · earn Sparks ✦'
							: 'Мини-игры, пока качаются моды · зарабатывай Спарки ✦'
					}}
				</p>
			</div>
		</div>
		<div class="games-grid">
			<button v-for="c in cards" :key="c.id" class="card hoverable game-card" @click="game = c.id">
				<div class="gico">{{ c.icon }}</div>
				<div class="gname">{{ lang === 'en' ? c.nameEn : c.nameRu }}</div>
				<div class="muted" style="font-size: 12px">{{ lang === 'en' ? c.descEn : c.descRu }}</div>
			</button>
		</div>
	</div>

	<div v-else>
		<button class="btn ghost" style="margin-bottom: 14px" @click="game = 'hub'">
			← {{ lang === 'en' ? 'All games' : 'Все игры' }}
		</button>
		<TetrisView v-if="game === 'tetris'" />
		<SnakeGame v-else-if="game === 'snake'" />
		<MinesGame v-else-if="game === 'mines'" />
	</div>
</template>

<style scoped>
.games-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: 14px;
	max-width: 720px;
}
.game-card {
	text-align: left;
	padding: 18px;
	cursor: pointer;
	border: 1px solid var(--border);
	background: var(--surface);
	color: var(--text);
	border-radius: var(--radius);
}
.gico {
	font-size: 32px;
	margin-bottom: 8px;
}
.gname {
	font-weight: 800;
	font-size: 16px;
	margin-bottom: 4px;
}
</style>
