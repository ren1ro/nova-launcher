<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { onMiniGameScore } from '../../core/economy'
import { lang } from '../../core/features'

const SIZE = 16
const CELL = 22

type Pt = { x: number; y: number }

const snake = ref<Pt[]>([{ x: 8, y: 8 }])
const dir = ref<Pt>({ x: 1, y: 0 })
const nextDir = ref<Pt>({ x: 1, y: 0 })
const food = ref<Pt>({ x: 12, y: 8 })
const score = ref(0)
const high = ref(Number(localStorage.getItem('nova.snake.high') || 0))
const playing = ref(false)
const dead = ref(false)
let timer: number | null = null

function placeFood() {
	const taken = new Set(snake.value.map((p) => `${p.x},${p.y}`))
	let p: Pt
	do {
		p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) }
	} while (taken.has(`${p.x},${p.y}`))
	food.value = p
}

function start() {
	snake.value = [
		{ x: 8, y: 8 },
		{ x: 7, y: 8 },
		{ x: 6, y: 8 },
	]
	dir.value = { x: 1, y: 0 }
	nextDir.value = { x: 1, y: 0 }
	score.value = 0
	dead.value = false
	playing.value = true
	placeFood()
	stop()
	timer = window.setInterval(tick, 120)
}

function stop() {
	if (timer != null) {
		clearInterval(timer)
		timer = null
	}
}

function tick() {
	if (!playing.value || dead.value) return
	dir.value = nextDir.value
	const head = snake.value[0]
	const nx = head.x + dir.value.x
	const ny = head.y + dir.value.y
	if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) return die()
	if (snake.value.some((s) => s.x === nx && s.y === ny)) return die()
	const next = [{ x: nx, y: ny }, ...snake.value]
	if (nx === food.value.x && ny === food.value.y) {
		score.value += 10
		placeFood()
	} else {
		next.pop()
	}
	snake.value = next
}

function die() {
	dead.value = true
	playing.value = false
	stop()
	const isNew = score.value > high.value
	if (isNew) {
		high.value = score.value
		localStorage.setItem('nova.snake.high', String(high.value))
	}
	onMiniGameScore('snake', score.value, { isNewRecord: isNew })
}

function onKey(e: KeyboardEvent) {
	const tag = (e.target as HTMLElement)?.tagName
	if (tag === 'INPUT' || tag === 'TEXTAREA') return
	const map: Record<string, Pt> = {
		ArrowUp: { x: 0, y: -1 },
		ArrowDown: { x: 0, y: 1 },
		ArrowLeft: { x: -1, y: 0 },
		ArrowRight: { x: 1, y: 0 },
		KeyW: { x: 0, y: -1 },
		KeyS: { x: 0, y: 1 },
		KeyA: { x: -1, y: 0 },
		KeyD: { x: 1, y: 0 },
	}
	const d = map[e.code]
	if (!d) {
		if (e.code === 'Space' && (!playing.value || dead.value)) start()
		return
	}
	e.preventDefault()
	if (dir.value.x + d.x === 0 && dir.value.y + d.y === 0) return
	nextDir.value = d
}

const cells = computed(() => {
	const g: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(''))
	for (const s of snake.value) {
		if (s.y >= 0 && s.y < SIZE && s.x >= 0 && s.x < SIZE) g[s.y][s.x] = 's'
	}
	const h = snake.value[0]
	if (h) g[h.y][h.x] = 'h'
	g[food.value.y][food.value.x] = 'f'
	return g
})

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
	window.removeEventListener('keydown', onKey)
	stop()
})
</script>

<template>
	<div class="gwrap">
		<div class="row" style="justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px">
			<div>
				<div class="muted">
					{{ lang === 'en' ? 'Score' : 'Счёт' }}: <b>{{ score }}</b> ·
					{{ lang === 'en' ? 'Best' : 'Рекорд' }}: {{ high }}
				</div>
				<div class="muted" style="font-size: 12px">WASD / arrows · Space</div>
			</div>
			<button class="btn" @click="start">
				{{ dead ? (lang === 'en' ? 'Again' : 'Ещё') : playing ? '…' : lang === 'en' ? 'Play' : 'Играть' }}
			</button>
		</div>
		<div class="board" :style="{ width: SIZE * CELL + 'px' }">
			<div v-for="(row, y) in cells" :key="y" class="r">
				<div
					v-for="(c, x) in row"
					:key="x"
					class="c"
					:class="c"
					:style="{ width: CELL + 'px', height: CELL + 'px' }"
				/>
			</div>
		</div>
		<div v-if="dead" class="muted" style="margin-top: 10px">
			Game Over · ✦ {{ lang === 'en' ? 'Sparks earned' : 'Спарки начислены' }}
		</div>
	</div>
</template>

<style scoped>
.board {
	border: 1px solid var(--border);
	border-radius: 8px;
	overflow: hidden;
	background: color-mix(in srgb, var(--bg) 80%, #000);
}
.r {
	display: flex;
}
.c {
	box-sizing: border-box;
	border: 1px solid color-mix(in srgb, var(--bg) 50%, transparent);
}
.c.s {
	background: var(--accent);
	border-radius: 3px;
}
.c.h {
	background: var(--accent2, #22d3ee);
	border-radius: 3px;
	box-shadow: 0 0 8px var(--accent2, #22d3ee);
}
.c.f {
	background: #f472b6;
	border-radius: 50%;
}
</style>
