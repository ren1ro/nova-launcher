<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { sampleSystemAudio, stopSystemAudio } from '../core/audioCapture'
import { liveBg, type AudioVisualStyle } from '../core/features'

const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0
let particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; hue: number }[] = []
let w = 0
let h = 0

function ensureDefaults() {
	const v = liveBg.value as typeof liveBg.value & Record<string, unknown>
	if (v.reactToSound == null) v.reactToSound = false
	if (v.audioSensitivity == null) v.audioSensitivity = 1.2
	if (v.audioStrength == null) v.audioStrength = 1.6
	if (v.audioBass == null) v.audioBass = 1.2
	if (v.audioSmooth == null) v.audioSmooth = 0.7
	if (v.audioStyle == null) v.audioStyle = 'spectrum'
	if (v.audioMix == null) v.audioMix = 'combined'
}

function resize() {
	const c = canvas.value
	if (!c) return
	const dpr = Math.min(window.devicePixelRatio || 1, 2)
	w = window.innerWidth
	h = window.innerHeight
	c.width = Math.floor(w * dpr)
	c.height = Math.floor(h * dpr)
	c.style.width = w + 'px'
	c.style.height = h + 'px'
	const ctx = c.getContext('2d')
	if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	spawn()
}

function spawn() {
	const n = Math.floor(40 * liveBg.value.intensity * (liveBg.value.kind === 'stars' ? 1.8 : 1))
	particles = []
	for (let i = 0; i < n; i++) {
		particles.push({
			x: Math.random() * w,
			y: Math.random() * h,
			vx: (Math.random() - 0.5) * 0.35 * liveBg.value.speed,
			vy: (Math.random() - 0.5) * 0.35 * liveBg.value.speed,
			r: 0.6 + Math.random() * 2.2,
			a: 0.15 + Math.random() * 0.55,
			hue: 250 + Math.random() * 80,
		})
	}
}

function strength() {
	return liveBg.value.audioStrength ?? 1.6
}
function style(): AudioVisualStyle {
	return (liveBg.value.audioStyle as AudioVisualStyle) || 'spectrum'
}

function drawSpectrum(
	ctx: CanvasRenderingContext2D,
	bins: number[],
	bassLevel: number,
) {
	const str = strength()
	const n = bins.length || 1
	const barW = w / n
	for (let i = 0; i < n; i++) {
		const v = bins[i] || 0
		const bh = v * h * 0.45 * str
		const hue = 260 + i * 2.2 + bassLevel * 40
		const g = ctx.createLinearGradient(0, h - bh, 0, h)
		g.addColorStop(0, `hsla(${hue},90%,65%,${0.18 + v * 0.55})`)
		g.addColorStop(1, `hsla(${hue + 30},80%,45%,0)`)
		ctx.fillStyle = g
		ctx.fillRect(i * barW + 1, h - bh, Math.max(2, barW - 2), bh)
		ctx.fillStyle = `hsla(${hue},90%,70%,${v * 0.14 * str})`
		ctx.fillRect(i * barW + 1, 0, Math.max(2, barW - 2), bh * 0.32)
	}
}

function drawPulse(ctx: CanvasRenderingContext2D, bassLevel: number, audioLevel: number) {
	const str = strength()
	const cx = w / 2
	const cy = h / 2
	const base = Math.min(w, h) * 0.12
	for (let i = 5; i >= 0; i--) {
		const r = base * (1 + i * 0.55) * (1 + (bassLevel * 1.5 + audioLevel * 0.5) * str)
		const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r)
		const hue = 270 + bassLevel * 50 - i * 8
		g.addColorStop(0, `hsla(${hue},90%,60%,${0.14 * (1 - i / 6) * str})`)
		g.addColorStop(0.55, `hsla(${hue + 20},80%,50%,${0.06 * str})`)
		g.addColorStop(1, `hsla(${hue},70%,40%,0)`)
		ctx.fillStyle = g
		ctx.beginPath()
		ctx.arc(cx, cy, r, 0, Math.PI * 2)
		ctx.fill()
	}
}

function drawRings(ctx: CanvasRenderingContext2D, bins: number[], audioLevel: number) {
	const str = strength()
	const cx = w / 2
	const cy = h / 2
	const t0 = performance.now() * 0.001
	ctx.lineWidth = 2.5
	for (let i = 0; i < 10; i++) {
		const energy = bins[i * 3] ?? audioLevel
		const r = 36 + i * 26 + energy * 90 * str + Math.sin(t0 + i) * 5
		ctx.strokeStyle = `hsla(${250 + i * 12},85%,65%,${0.1 + energy * 0.4 * str})`
		ctx.beginPath()
		ctx.arc(cx, cy, r, 0, Math.PI * 2)
		ctx.stroke()
	}
}

function drawOrbit(
	ctx: CanvasRenderingContext2D,
	bassLevel: number,
	midLevel: number,
	audioLevel: number,
) {
	const str = strength()
	const cx = w / 2
	const cy = h / 2
	const t0 = performance.now() * 0.001
	const energy = 0.3 + (bassLevel * 1.15 + audioLevel * 0.45) * str

	const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.18 * (1 + energy))
	core.addColorStop(0, `hsla(275,85%,65%,${0.14 + bassLevel * 0.22})`)
	core.addColorStop(1, 'transparent')
	ctx.fillStyle = core
	ctx.beginPath()
	ctx.arc(cx, cy, Math.min(w, h) * 0.2 * (0.8 + energy * 0.4), 0, Math.PI * 2)
	ctx.fill()

	for (let o = 0; o < 5; o++) {
		const radius = 55 + o * 44 + bassLevel * 40 * str + midLevel * 18
		ctx.strokeStyle = `hsla(${250 + o * 16},70%,55%,${0.07 + audioLevel * 0.1})`
		ctx.lineWidth = 1.15
		ctx.beginPath()
		ctx.arc(cx, cy, radius, 0, Math.PI * 2)
		ctx.stroke()

		const dots = 7 + o * 2
		for (let d = 0; d < dots; d++) {
			const ang = t0 * (0.35 + o * 0.12) * (o % 2 === 0 ? 1 : -1) + (d / dots) * Math.PI * 2
			const punch = 1 + bassLevel * 0.12 * Math.sin(t0 * 4 + d)
			const x = cx + Math.cos(ang) * radius * punch
			const y = cy + Math.sin(ang) * radius * punch
			const r = 2 + (2.5 + o * 0.4) * (0.5 + audioLevel) * (0.7 + bassLevel)
			ctx.beginPath()
			ctx.arc(x, y, r * str * 0.85, 0, Math.PI * 2)
			ctx.fillStyle = `hsla(${255 + o * 14 + d * 5},90%,72%,${0.4 + audioLevel * 0.35})`
			ctx.fill()
		}
	}
}


function drawPiano(
	ctx: CanvasRenderingContext2D,
	bins: number[],
	bassLevel: number,
	audioLevel: number,
) {
	const str = strength()
	const keys = Math.min(32, Math.max(16, bins.length || 24))
	const gap = 3
	const keyW = (w - gap * (keys + 1)) / keys
	const maxH = h * 0.55 * str
	const baseY = h * 0.92
	// soft floor glow
	const floor = ctx.createLinearGradient(0, h * 0.5, 0, h)
	floor.addColorStop(0, 'transparent')
	floor.addColorStop(1, `hsla(270,60%,40%,${0.08 + audioLevel * 0.12})`)
	ctx.fillStyle = floor
	ctx.fillRect(0, h * 0.5, w, h * 0.5)

	for (let i = 0; i < keys; i++) {
		const bin = bins[Math.floor((i / keys) * bins.length)] ?? 0
		const v = Math.min(1, bin * 1.15 + (i % 4 === 0 ? bassLevel * 0.25 : 0))
		const kh = Math.max(8, v * maxH)
		const x = gap + i * (keyW + gap)
		const y = baseY - kh
		const isBlack = [1, 3, 6, 8, 10].includes(i % 12)
		const hue = isBlack ? 280 + v * 20 : 250 + i * 3 + bassLevel * 30
		const g = ctx.createLinearGradient(x, y, x, baseY)
		if (isBlack) {
			g.addColorStop(0, `hsla(${hue},70%,55%,${0.35 + v * 0.55})`)
			g.addColorStop(1, `hsla(${hue},50%,25%,${0.15 + v * 0.25})`)
		} else {
			g.addColorStop(0, `hsla(${hue},85%,75%,${0.4 + v * 0.5})`)
			g.addColorStop(1, `hsla(${hue},70%,45%,${0.12 + v * 0.3})`)
		}
		// rounded key
		const r = Math.min(6, keyW / 3)
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + keyW - r, y)
		ctx.quadraticCurveTo(x + keyW, y, x + keyW, y + r)
		ctx.lineTo(x + keyW, baseY)
		ctx.lineTo(x, baseY)
		ctx.lineTo(x, y + r)
		ctx.quadraticCurveTo(x, y, x + r, y)
		ctx.closePath()
		ctx.fillStyle = g
		ctx.fill()
		// top highlight
		ctx.fillStyle = `hsla(${hue},90%,90%,${0.15 + v * 0.35})`
		ctx.fillRect(x + 2, y + 2, keyW - 4, Math.min(10, kh * 0.15))
	}
}

function drawEnhanceBase(
	ctx: CanvasRenderingContext2D,
	bassLevel: number,
	midLevel: number,
	audioLevel: number,
) {
	const kind = liveBg.value.kind
	const str = strength()
	const reactive = liveBg.value.reactToSound
	const mul = reactive ? 1 + (bassLevel * 1.3 + audioLevel * 0.7) * str * 0.9 : 1
	const spd = liveBg.value.speed * mul
	const intens = liveBg.value.intensity * (reactive ? 0.9 + audioLevel * 0.75 * str : 1)

	if (kind === 'aurora') {
		const t0 = performance.now() * 0.00015 * spd
		for (let i = 0; i < 4; i++) {
			const g = ctx.createLinearGradient(0, 0, w, h)
			const hue = 160 + i * 40 + Math.sin(t0 + i) * 30 + bassLevel * 55
			g.addColorStop(0, `hsla(${hue},80%,55%,0)`)
			g.addColorStop(0.4, `hsla(${hue},90%,60%,${0.07 * intens})`)
			g.addColorStop(0.7, `hsla(${hue + 40},80%,50%,${0.1 * intens})`)
			g.addColorStop(1, `hsla(${hue},70%,40%,0)`)
			ctx.fillStyle = g
			ctx.beginPath()
			ctx.moveTo(0, h * (0.2 + i * 0.15))
			for (let x = 0; x <= w; x += 16) {
				const y =
					h * (0.25 + i * 0.12) +
					Math.sin(x * 0.004 + t0 * 2 + i) * 48 * intens +
					Math.cos(x * 0.002 - t0 + i) * 28 +
					bassLevel * Math.sin(x * 0.01 + t0 * 3) * 60 * str
				ctx.lineTo(x, y)
			}
			ctx.lineTo(w, h)
			ctx.lineTo(0, h)
			ctx.closePath()
			ctx.fill()
		}
	} else if (kind === 'waves') {
		// audio-friendly waves (old soft waves were weak with bass)
		drawOrbit(ctx, bassLevel, midLevel, audioLevel)
		if (!reactive) {
			const t0 = performance.now() * 0.001 * spd
			for (let layer = 0; layer < 3; layer++) {
				ctx.beginPath()
				ctx.moveTo(0, h)
				for (let x = 0; x <= w; x += 8) {
					const y =
						h * 0.55 +
						layer * 30 +
						Math.sin(x * 0.008 + t0 + layer) * (18 + layer * 8) * intens +
						Math.sin(x * 0.02 - t0 * 0.7) * 8
					ctx.lineTo(x, y)
				}
				ctx.lineTo(w, h)
				ctx.lineTo(0, h)
				ctx.closePath()
				ctx.fillStyle = `hsla(${260 + layer * 20},70%,55%,${0.04 + layer * 0.02})`
				ctx.fill()
			}
		}
	} else {
		for (const p of particles) {
			p.x += p.vx * spd * (1 + audioLevel * str * (reactive ? 1 : 0))
			p.y += p.vy * spd * (1 + audioLevel * str * (reactive ? 1 : 0))
			if (p.x < -10) p.x = w + 10
			if (p.x > w + 10) p.x = -10
			if (p.y < -10) p.y = h + 10
			if (p.y > h + 10) p.y = -10
			const rr = p.r * (1 + bassLevel * 0.85 * str * (reactive ? 1 : 0))
			if (kind === 'stars') {
				const tw =
					0.5 +
					0.5 * Math.sin(performance.now() * 0.003 * spd + p.hue) +
					audioLevel * 0.4 * (reactive ? 1 : 0)
				ctx.beginPath()
				ctx.arc(p.x, p.y, rr * 0.7, 0, Math.PI * 2)
				ctx.fillStyle = `rgba(255,255,255,${Math.min(1, p.a * tw * intens)})`
				ctx.fill()
			} else {
				ctx.beginPath()
				ctx.arc(p.x, p.y, rr, 0, Math.PI * 2)
				ctx.fillStyle = `hsla(${p.hue + audioLevel * 50},80%,70%,${p.a * intens})`
				ctx.fill()
			}
		}
	}
}

function frame() {
	if (document.hidden) {
		raf = requestAnimationFrame(frame)
		return
	}
	const c = canvas.value
	if (!c || !liveBg.value.enabled) {
		raf = requestAnimationFrame(frame)
		return
	}
	if (liveBg.value.kind === 'none' && !liveBg.value.reactToSound) {
		raf = requestAnimationFrame(frame)
		return
	}
	const ctx = c.getContext('2d')
	if (!ctx) {
		raf = requestAnimationFrame(frame)
		return
	}

	const st = sampleSystemAudio({
		sensitivity: liveBg.value.audioSensitivity ?? 1.2,
		bass: liveBg.value.audioBass ?? 1.2,
		smooth: liveBg.value.audioSmooth ?? 0.7,
	})
	const { audioLevel, bassLevel, midLevel, smoothBins } = st

	ctx.clearRect(0, 0, w, h)
	const reactive = liveBg.value.reactToSound && st.active
	const vis = style()
	const audioOnly = (liveBg.value.audioMix || 'combined') === 'audio_only'
	const showLive = liveBg.value.kind !== 'none' && !audioOnly

	if (!reactive) {
		if (showLive) drawEnhanceBase(ctx, 0, 0, 0)
	} else if (vis === 'enhance') {
		if (showLive) drawEnhanceBase(ctx, bassLevel, midLevel, audioLevel)
		else drawOrbit(ctx, bassLevel, midLevel, audioLevel)
	} else {
		if (showLive) {
			ctx.globalAlpha = 0.28
			drawEnhanceBase(ctx, bassLevel, midLevel, audioLevel)
			ctx.globalAlpha = 1
		}
		if (vis === 'spectrum') drawSpectrum(ctx, smoothBins, bassLevel)
		else if (vis === 'pulse') drawPulse(ctx, bassLevel, audioLevel)
		else if (vis === 'rings') drawRings(ctx, smoothBins, audioLevel)
		else if (vis === 'orbit') drawOrbit(ctx, bassLevel, midLevel, audioLevel)
		else if (vis === 'piano') drawPiano(ctx, smoothBins, bassLevel, audioLevel)
	}

	raf = requestAnimationFrame(frame)
}

onMounted(() => {
	ensureDefaults()
	resize()
	window.addEventListener('resize', resize)
	raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
	cancelAnimationFrame(raf)
	window.removeEventListener('resize', resize)
})
watch(
	() => [liveBg.value.kind, liveBg.value.intensity, liveBg.value.enabled],
	() => spawn(),
)
watch(
	() => liveBg.value.reactToSound,
	(on) => {
		if (!on) void stopSystemAudio()
	},
)
</script>

<template>
	<div
		v-if="liveBg.enabled && liveBg.kind === 'image' && liveBg.customImage"
		class="live-bg bg-image-layer"
		:style="{ backgroundImage: `url(${liveBg.customImage})` }"
	>
		<div class="bg-image-dim" :style="{ opacity: liveBg.dim }"></div>
	</div>
	<canvas
		v-show="liveBg.enabled && liveBg.kind !== 'image' && (liveBg.kind !== 'none' || liveBg.reactToSound)"
		ref="canvas"
		class="live-bg"
		aria-hidden="true"
	/>
</template>

<style scoped>
.live-bg {
	position: fixed;
	inset: 0;
	z-index: 0;
	pointer-events: none;
}
.bg-image-layer {
	background-size: cover;
	background-position: center;
}
.bg-image-dim {
	position: absolute;
	inset: 0;
	background: #000;
}
</style>
