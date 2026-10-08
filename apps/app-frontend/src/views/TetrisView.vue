<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import {
	gameOverStyle,
	hasItem,
	onTetrisScore,
	playWinSound,
} from '../core/economy'
import { t } from '../core/features'

const COLS = 10
const ROWS = 20
const CELL = 28

type Cell = number // 0 empty, 1-7 colors
type Board = Cell[][]

const COLORS = ['', '#a78bfa', '#22d3ee', '#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#fb923c']

const SHAPES: number[][][] = [
	// I
	[[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
	// O
	[[2, 2], [2, 2]],
	// T
	[[0, 3, 0], [3, 3, 3], [0, 0, 0]],
	// S
	[[0, 4, 4], [4, 4, 0], [0, 0, 0]],
	// Z
	[[5, 5, 0], [0, 5, 5], [0, 0, 0]],
	// J
	[[6, 0, 0], [6, 6, 6], [0, 0, 0]],
	// L
	[[0, 0, 7], [7, 7, 7], [0, 0, 0]],
]

function emptyBoard(): Board {
	return Array.from({ length: ROWS }, () => Array(COLS).fill(0))
}

function rotate(m: number[][]): number[][] {
	const N = m.length
	const r = Array.from({ length: N }, () => Array(N).fill(0))
	for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) r[x][N - 1 - y] = m[y][x]
	return r
}

function randPiece() {
	const i = Math.floor(Math.random() * SHAPES.length)
	const shape = SHAPES[i].map((row) => [...row])
	return { shape, id: i + 1 }
}

const board = ref<Board>(emptyBoard())
const piece = ref<{ shape: number[][]; x: number; y: number; id: number } | null>(null)
const next = ref(randPiece())
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const playing = ref(false)
const paused = ref(false)
const gameOver = ref(false)
const high = ref(Number(localStorage.getItem('nova.tetris.high') || 0))
const mode = ref<'classic' | 'mirror' | 'speed'>('classic')
const sessionLines = ref(0)
const goStyle = computed(() => gameOverStyle())
const canMirror = computed(() => hasItem('mode_mirror'))
const canSpeed = computed(() => hasItem('mode_speed'))

let timer: number | null = null

const speed = computed(() => {
	const base = Math.max(80, 700 - (level.value - 1) * 60)
	return mode.value === 'speed' ? Math.max(50, Math.floor(base * 0.55)) : base
})

function spawn() {
	const p = next.value
	next.value = randPiece()
	const shape = p.shape
	const x = Math.floor((COLS - shape[0].length) / 2)
	piece.value = { shape, x, y: 0, id: p.id }
	if (collides(board.value, shape, x, 0)) {
		gameOver.value = true
		playing.value = false
		stopLoop()
		const isNew = score.value > high.value
		if (isNew) {
			high.value = score.value
			localStorage.setItem('nova.tetris.high', String(high.value))
			playWinSound()
		}
		onTetrisScore(score.value, sessionLines.value, isNew)
	}
}

function collides(b: Board, shape: number[][], ox: number, oy: number) {
	for (let y = 0; y < shape.length; y++) {
		for (let x = 0; x < shape[y].length; x++) {
			if (!shape[y][x]) continue
			const nx = ox + x
			const ny = oy + y
			if (nx < 0 || nx >= COLS || ny >= ROWS) return true
			if (ny >= 0 && b[ny][nx]) return true
		}
	}
	return false
}

function merge(b: Board, shape: number[][], ox: number, oy: number, id: number) {
	const nb = b.map((r) => [...r])
	for (let y = 0; y < shape.length; y++) {
		for (let x = 0; x < shape[y].length; x++) {
			if (!shape[y][x]) continue
			const ny = oy + y
			const nx = ox + x
			if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) nb[ny][nx] = id
		}
	}
	return nb
}

function clearLines(b: Board) {
	const notFull = b.filter((row) => row.some((c) => c === 0))
	const cleared = ROWS - notFull.length
	while (notFull.length < ROWS) notFull.unshift(Array(COLS).fill(0))
	return { board: notFull, cleared }
}

function hardDrop() {
	if (!piece.value || !playing.value || paused.value) return
	let y = piece.value.y
	while (!collides(board.value, piece.value.shape, piece.value.x, y + 1)) y++
	piece.value = { ...piece.value, y }
	lock()
}

function lock() {
	if (!piece.value) return
	const { shape, x, y, id } = piece.value
	let b = merge(board.value, shape, x, y, id)
	const { board: nb, cleared } = clearLines(b)
	board.value = nb
	if (cleared) {
		const pts = [0, 100, 300, 500, 800][cleared] || cleared * 200
		score.value += pts * level.value
		lines.value += cleared
		sessionLines.value += cleared
		level.value = 1 + Math.floor(lines.value / 10)
	}
	piece.value = null
	spawn()
	restartLoop()
}

function tick() {
	if (!playing.value || paused.value || !piece.value) return
	const { shape, x, y, id } = piece.value
	if (!collides(board.value, shape, x, y + 1)) {
		piece.value = { shape, x, y: y + 1, id }
	} else {
		lock()
	}
}

function move(dx: number) {
	if (!piece.value || !playing.value || paused.value) return
	if (mode.value === 'mirror') dx = -dx
	const { shape, x, y, id } = piece.value
	if (!collides(board.value, shape, x + dx, y)) piece.value = { shape, x: x + dx, y, id }
}

function rotatePiece() {
	if (!piece.value || !playing.value || paused.value) return
	const rotated = rotate(piece.value.shape)
	const kicks = [0, -1, 1, -2, 2]
	for (const k of kicks) {
		if (!collides(board.value, rotated, piece.value.x + k, piece.value.y)) {
			piece.value = { ...piece.value, shape: rotated, x: piece.value.x + k }
			return
		}
	}
}

function softDrop() {
	if (!piece.value || !playing.value || paused.value) return
	const { shape, x, y, id } = piece.value
	if (!collides(board.value, shape, x, y + 1)) {
		piece.value = { shape, x, y: y + 1, id }
		score.value += 1
	} else lock()
}

function startLoop() {
	stopLoop()
	timer = window.setInterval(tick, speed.value)
}
function stopLoop() {
	if (timer != null) {
		clearInterval(timer)
		timer = null
	}
}
function restartLoop() {
	if (playing.value && !paused.value) startLoop()
}

function startGame() {
	board.value = emptyBoard()
	score.value = 0
	lines.value = 0
	sessionLines.value = 0
	level.value = 1
	gameOver.value = false
	paused.value = false
	playing.value = true
	next.value = randPiece()
	spawn()
	startLoop()
}

function togglePause() {
	if (!playing.value || gameOver.value) return
	paused.value = !paused.value
	if (paused.value) stopLoop()
	else startLoop()
}

function onKey(e: KeyboardEvent) {
	const tag = (e.target as HTMLElement)?.tagName
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
	if (!playing.value && (e.code === 'Space' || e.code === 'Enter')) {
		e.preventDefault()
		startGame()
		return
	}
	if (!playing.value) return
	switch (e.code) {
		case 'ArrowLeft':
		case 'KeyA':
			e.preventDefault()
			move(-1)
			break
		case 'ArrowRight':
		case 'KeyD':
			e.preventDefault()
			move(1)
			break
		case 'ArrowDown':
		case 'KeyS':
			e.preventDefault()
			softDrop()
			break
		case 'ArrowUp':
		case 'KeyW':
		case 'KeyX':
			e.preventDefault()
			rotatePiece()
			break
		case 'Space':
			e.preventDefault()
			hardDrop()
			break
		case 'KeyP':
		case 'Escape':
			e.preventDefault()
			togglePause()
			break
	}
}

/** cells for display including active piece */
const display = computed(() => {
	let b = board.value.map((r) => [...r])
	const p = piece.value
	if (p) {
		for (let y = 0; y < p.shape.length; y++) {
			for (let x = 0; x < p.shape[y].length; x++) {
				if (!p.shape[y][x]) continue
				const ny = p.y + y
				const nx = p.x + x
				if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) b[ny][nx] = p.id
			}
		}
	}
	return b
})

const nextCells = computed(() => {
	const s = next.value.shape
	const size = Math.max(s.length, s[0]?.length || 0, 4)
	const grid = Array.from({ length: size }, () => Array(size).fill(0))
	for (let y = 0; y < s.length; y++) for (let x = 0; x < s[y].length; x++) if (s[y][x]) grid[y][x] = next.value.id
	return grid
})

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
	window.removeEventListener('keydown', onKey)
	stopLoop()
})
</script>

<template>
	<div class="tetris-page">
		<div class="page-head">
			<div>
				<h1>Tetris</h1>
				<p>{{ langHint }}</p>
			</div>
			<div class="row" style="flex-wrap: wrap">
				<select v-model="mode" class="select" :disabled="playing && !gameOver" style="max-width: 160px">
					<option value="classic">Classic</option>
					<option v-if="canMirror" value="mirror">Mirror</option>
					<option v-if="canSpeed" value="speed">Speed</option>
				</select>
				<button v-if="!playing || gameOver" class="btn" @click="startGame">{{ gameOver ? 'Again' : 'Play' }}</button>
				<button v-else class="btn ghost" @click="togglePause">{{ paused ? 'Resume' : 'Pause' }}</button>
			</div>
		</div>

		<div class="tetris-wrap">
			<div class="board-frame card">
				<div
					class="board"
					:style="{
						width: COLS * CELL + 'px',
						height: ROWS * CELL + 'px',
						transform: mode === 'mirror' ? 'scaleX(-1)' : undefined,
					}"
				>
					<div
						v-for="(row, y) in display"
						:key="y"
						class="row-cells"
					>
						<div
							v-for="(c, x) in row"
							:key="x"
							class="cell"
							:class="{ on: c }"
							:style="{
								width: CELL + 'px',
								height: CELL + 'px',
								background: c ? COLORS[c] : 'transparent',
								boxShadow: c ? `0 0 12px ${COLORS[c]}55` : 'none',
							}"
						/>
					</div>
					<div v-if="!playing && !gameOver" class="overlay">
						<button class="btn" @click="startGame">Старт</button>
					</div>
					<div v-if="paused" class="overlay"><span>ПАУЗА</span></div>
					<div v-if="gameOver" class="overlay" :class="goStyle">
						<div>
							<div style="font-weight: 800; margin-bottom: 8px">GAME OVER</div>
							<button class="btn" @click="startGame">Ещё раз</button>
						</div>
					</div>
				</div>
			</div>

			<div class="side">
				<div class="card section stat">
					<div class="muted">Счёт</div>
					<div class="big">{{ score }}</div>
				</div>
				<div class="card section stat">
					<div class="muted">Рекорд</div>
					<div class="big">{{ high }}</div>
				</div>
				<div class="card section stat">
					<div class="muted">Линии</div>
					<div class="big">{{ lines }}</div>
				</div>
				<div class="card section stat">
					<div class="muted">Уровень</div>
					<div class="big">{{ level }}</div>
				</div>
				<div class="card section">
					<div class="muted" style="margin-bottom: 8px">Следующая</div>
					<div class="next">
						<div v-for="(row, y) in nextCells" :key="y" class="row-cells">
							<div
								v-for="(c, x) in row"
								:key="x"
								class="cell sm"
								:style="{ background: c ? COLORS[c] : 'transparent' }"
							/>
						</div>
					</div>
				</div>
				<div class="card section keys muted" style="font-size: 12px; line-height: 1.6">
					← → двигать<br />
					↑ / W поворот<br />
					↓ ускорить<br />
					Space сброс вниз<br />
					P пауза
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.tetris-page { max-width: 720px; }
.tetris-wrap {
	display: flex;
	gap: 20px;
	flex-wrap: wrap;
	align-items: flex-start;
}
.board-frame { padding: 12px; position: relative; }
.board {
	display: flex;
	flex-direction: column;
	background:
		linear-gradient(var(--border) 1px, transparent 1px) 0 0 / 28px 28px,
		linear-gradient(90deg, var(--border) 1px, transparent 1px) 0 0 / 28px 28px,
		color-mix(in srgb, var(--bg) 60%, #000);
	border-radius: 8px;
	overflow: hidden;
	position: relative;
	border: 1px solid var(--border);
}
.row-cells { display: flex; }
.cell {
	box-sizing: border-box;
	border-radius: 4px;
	border: 1px solid color-mix(in srgb, var(--bg) 40%, transparent);
}
.cell.sm { width: 14px; height: 14px; border-radius: 2px; }
.overlay {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	background: color-mix(in srgb, var(--bg) 75%, transparent);
	backdrop-filter: blur(4px);
	font-size: 22px;
	font-weight: 700;
	letter-spacing: 0.08em;
}
.side { display: flex; flex-direction: column; gap: 10px; min-width: 140px; }
.stat .big { font-size: 22px; font-weight: 800; font-family: var(--font-head); }
.next { display: inline-block; }
.go_glitch { animation: glitch 0.4s infinite; color: #f472b6; }
.go_nova { color: var(--accent); text-shadow: 0 0 20px var(--accent); }
.go_matrix { color: #22c55e; font-family: var(--font-mono, monospace); }
@keyframes glitch {
	0% { transform: translate(0); }
	25% { transform: translate(-2px, 1px); }
	50% { transform: translate(2px, -1px); }
	75% { transform: translate(-1px, -2px); }
	100% { transform: translate(0); }
}
</style>
