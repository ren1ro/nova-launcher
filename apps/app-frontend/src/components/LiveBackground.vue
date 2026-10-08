<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { liveBg } from '../core/features'

const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0
let particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; hue: number }[] = []
let w = 0
let h = 0

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

function frame() {
	const c = canvas.value
	if (!c || !liveBg.value.enabled || liveBg.value.kind === 'none') {
		raf = requestAnimationFrame(frame)
		return
	}
	const ctx = c.getContext('2d')
	if (!ctx) return
	ctx.clearRect(0, 0, w, h)

	const kind = liveBg.value.kind
	const spd = liveBg.value.speed

	if (kind === 'aurora') {
		const t = performance.now() * 0.00015 * spd
		for (let i = 0; i < 4; i++) {
			const g = ctx.createLinearGradient(0, 0, w, h)
			const hue = 160 + i * 40 + Math.sin(t + i) * 30
			g.addColorStop(0, `hsla(${hue},80%,55%,0)`)
			g.addColorStop(0.4, `hsla(${hue},90%,60%,${0.06 * liveBg.value.intensity})`)
			g.addColorStop(0.7, `hsla(${hue + 40},80%,50%,${0.08 * liveBg.value.intensity})`)
			g.addColorStop(1, `hsla(${hue},70%,40%,0)`)
			ctx.fillStyle = g
			ctx.beginPath()
			ctx.moveTo(0, h * (0.2 + i * 0.15))
			for (let x = 0; x <= w; x += 20) {
				const y =
					h * (0.25 + i * 0.12) +
					Math.sin(x * 0.004 + t * 2 + i) * 40 * liveBg.value.intensity +
					Math.cos(x * 0.002 - t + i) * 25
				ctx.lineTo(x, y)
			}
			ctx.lineTo(w, h)
			ctx.lineTo(0, h)
			ctx.closePath()
			ctx.fill()
		}
	} else if (kind === 'waves') {
		const t = performance.now() * 0.001 * spd
		for (let layer = 0; layer < 3; layer++) {
			ctx.beginPath()
			ctx.moveTo(0, h)
			for (let x = 0; x <= w; x += 8) {
				const y =
					h * 0.55 +
					layer * 30 +
					Math.sin(x * 0.008 + t + layer) * (18 + layer * 8) * liveBg.value.intensity +
					Math.sin(x * 0.02 - t * 0.7) * 8
				ctx.lineTo(x, y)
			}
			ctx.lineTo(w, h)
			ctx.lineTo(0, h)
			ctx.closePath()
			ctx.fillStyle = `hsla(${260 + layer * 20},70%,55%,${0.04 + layer * 0.02})`
			ctx.fill()
		}
	} else {
		// particles / stars
		for (const p of particles) {
			p.x += p.vx * spd
			p.y += p.vy * spd
			if (p.x < -10) p.x = w + 10
			if (p.x > w + 10) p.x = -10
			if (p.y < -10) p.y = h + 10
			if (p.y > h + 10) p.y = -10

			if (kind === 'stars') {
				const twinkle = 0.5 + 0.5 * Math.sin(performance.now() * 0.003 * spd + p.hue)
				ctx.beginPath()
				ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2)
				ctx.fillStyle = `rgba(255,255,255,${p.a * twinkle * liveBg.value.intensity})`
				ctx.fill()
				ctx.beginPath()
				ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2)
				ctx.fillStyle = `rgba(200,180,255,${0.08 * twinkle * liveBg.value.intensity})`
				ctx.fill()
			} else {
				ctx.beginPath()
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
				ctx.fillStyle = `hsla(${p.hue},80%,70%,${p.a * liveBg.value.intensity})`
				ctx.fill()
			}
		}
		// soft links between nearby particles
		if (kind === 'particles') {
			ctx.strokeStyle = `rgba(180,140,255,${0.06 * liveBg.value.intensity})`
			ctx.lineWidth = 1
			for (let i = 0; i < particles.length; i++) {
				for (let j = i + 1; j < particles.length; j++) {
					const a = particles[i]
					const b = particles[j]
					const dx = a.x - b.x
					const dy = a.y - b.y
					const d2 = dx * dx + dy * dy
					if (d2 < 120 * 120) {
						ctx.beginPath()
						ctx.moveTo(a.x, a.y)
						ctx.lineTo(b.x, b.y)
						ctx.stroke()
					}
				}
			}
		}
	}

	raf = requestAnimationFrame(frame)
}

onMounted(() => {
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
</script>

<template>
	<div
		v-if="liveBg.enabled && liveBg.kind === 'image' && liveBg.customImage"
		class="live-bg bg-image-layer"
		:style="{
			backgroundImage: `url(${liveBg.customImage})`,
			opacity: 1,
		}"
	>
		<div class="bg-image-dim" :style="{ opacity: liveBg.dim }"></div>
	</div>
	<canvas
		v-show="liveBg.enabled && liveBg.kind !== 'none' && liveBg.kind !== 'image'"
		ref="canvas"
		class="live-bg"
		aria-hidden="true"
	/>
</template>

<style scoped>
.live-bg {
	position: fixed;
	inset: 0;
	z-index: 1;
	pointer-events: none;
}
.bg-image-layer {
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
}
.bg-image-dim {
	position: absolute;
	inset: 0;
	background: #000;
}
</style>
