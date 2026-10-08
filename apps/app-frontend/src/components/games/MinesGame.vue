<script setup lang="ts">
import { computed, ref } from 'vue'

import { onMiniGameScore } from '../../core/economy'
import { lang } from '../../core/features'

const W = 10
const H = 10
const MINES = 12

type Cell = { mine: boolean; open: boolean; flag: boolean; n: number }

const grid = ref<Cell[][]>([])
const status = ref<'idle' | 'play' | 'win' | 'lose'>('idle')
const opened = ref(0)

function empty(): Cell[][] {
	return Array.from({ length: H }, () =>
		Array.from({ length: W }, () => ({ mine: false, open: false, flag: false, n: 0 })),
	)
}

function start() {
	const g = empty()
	let placed = 0
	while (placed < MINES) {
		const x = Math.floor(Math.random() * W)
		const y = Math.floor(Math.random() * H)
		if (!g[y][x].mine) {
			g[y][x].mine = true
			placed++
		}
	}
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			if (g[y][x].mine) continue
			let n = 0
			for (let dy = -1; dy <= 1; dy++)
				for (let dx = -1; dx <= 1; dx++) {
					const ny = y + dy
					const nx = x + dx
					if (ny >= 0 && ny < H && nx >= 0 && nx < W && g[ny][nx].mine) n++
				}
			g[y][x].n = n
		}
	}
	grid.value = g
	status.value = 'play'
	opened.value = 0
}

function flood(x: number, y: number) {
	const stack = [[x, y]]
	while (stack.length) {
		const [cx, cy] = stack.pop()!
		const c = grid.value[cy]?.[cx]
		if (!c || c.open || c.flag) continue
		c.open = true
		opened.value++
		if (c.n === 0 && !c.mine) {
			for (let dy = -1; dy <= 1; dy++)
				for (let dx = -1; dx <= 1; dx++) {
					const nx = cx + dx
					const ny = cy + dy
					if (nx >= 0 && nx < W && ny >= 0 && ny < H) stack.push([nx, ny])
				}
		}
	}
}

function click(x: number, y: number) {
	if (status.value !== 'play') return
	const c = grid.value[y][x]
	if (c.open || c.flag) return
	if (c.mine) {
		c.open = true
		status.value = 'lose'
		for (const row of grid.value) for (const cell of row) if (cell.mine) cell.open = true
		onMiniGameScore('mines', opened.value * 5, { isWin: false })
		return
	}
	flood(x, y)
	const need = W * H - MINES
	if (opened.value >= need) {
		status.value = 'win'
		onMiniGameScore('mines', 100 + opened.value, { isWin: true })
	}
}

function flag(e: Event, x: number, y: number) {
	e.preventDefault()
	if (status.value !== 'play') return
	const c = grid.value[y][x]
	if (c.open) return
	c.flag = !c.flag
}

const label = computed(() => {
	if (status.value === 'win') return lang.value === 'en' ? 'Cleared! ✦' : 'Победа! ✦'
	if (status.value === 'lose') return lang.value === 'en' ? 'Boom' : 'Бум'
	return `${MINES} 💣`
})

start()
</script>

<template>
	<div class="gwrap">
		<div class="row" style="justify-content: space-between; margin-bottom: 12px">
			<div class="muted">{{ label }}</div>
			<button class="btn" @click="start">{{ lang === 'en' ? 'New' : 'Заново' }}</button>
		</div>
		<div class="ms">
			<div v-for="(row, y) in grid" :key="y" class="r">
				<button
					v-for="(c, x) in row"
					:key="x"
					class="cell"
					:class="{ open: c.open, mine: c.open && c.mine, flag: c.flag }"
					@click="click(x, y)"
					@contextmenu="flag($event, x, y)"
				>
					<template v-if="c.flag && !c.open">🚩</template>
					<template v-else-if="c.open && c.mine">💣</template>
					<template v-else-if="c.open && c.n">{{ c.n }}</template>
				</button>
			</div>
		</div>
		<p class="muted" style="font-size: 12px; margin-top: 10px">
			{{ lang === 'en' ? 'Left click open · Right click flag' : 'ЛКМ — открыть · ПКМ — флаг' }}
		</p>
	</div>
</template>

<style scoped>
.ms {
	display: inline-block;
	border: 1px solid var(--border);
	border-radius: 8px;
	overflow: hidden;
}
.r {
	display: flex;
}
.cell {
	width: 28px;
	height: 28px;
	border: 1px solid var(--border);
	background: var(--surface-2);
	color: var(--text);
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
	padding: 0;
}
.cell.open {
	background: color-mix(in srgb, var(--bg) 70%, #000);
}
.cell.mine {
	background: #7f1d1d;
}
.cell.flag {
	background: var(--surface);
}
</style>
