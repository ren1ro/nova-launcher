<script setup lang="ts">
import { watch } from 'vue'
import { endLaunchAnim, launchAnim } from '../core/features'

watch(
	() => launchAnim.value.active,
	(on) => {
		if (on) {
			// auto-hide after animation
			setTimeout(() => endLaunchAnim(), 2200)
		}
	},
)
</script>

<template>
	<Transition name="launch">
		<div v-if="launchAnim.active" class="launch-overlay">
			<div class="burst"></div>
			<div class="ring"></div>
			<div class="ring delay"></div>
			<div class="center">
				<div class="ico">
					<img v-if="launchAnim.iconUrl" :src="launchAnim.iconUrl" alt="" />
					<span v-else>{{ launchAnim.instanceName.slice(0, 1).toUpperCase() }}</span>
				</div>
				<div class="title">Запуск</div>
				<div class="name">{{ launchAnim.instanceName }}</div>
				<div class="bar"><i></i></div>
			</div>
		</div>
	</Transition>
</template>

<style scoped>
.launch-overlay {
	position: fixed;
	inset: 0;
	z-index: 9000;
	display: grid;
	place-items: center;
	background: color-mix(in srgb, var(--bg) 78%, #000);
	backdrop-filter: blur(18px) saturate(1.2);
	pointer-events: none;
}
.burst {
	position: absolute;
	width: 120vmax;
	height: 120vmax;
	border-radius: 50%;
	background: radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent), transparent 60%);
	animation: burst 1.8s ease-out forwards;
	opacity: 0;
}
.ring {
	position: absolute;
	width: 180px;
	height: 180px;
	border-radius: 50%;
	border: 2px solid var(--accent);
	opacity: 0;
	animation: ring 1.6s ease-out forwards;
}
.ring.delay {
	animation-delay: 0.25s;
	border-color: var(--accent-2);
}
.center {
	position: relative;
	text-align: center;
	animation: pop 0.55s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
.ico {
	width: 88px;
	height: 88px;
	margin: 0 auto 16px;
	border-radius: 22px;
	background: var(--surface-2);
	border: 1px solid var(--border);
	display: grid;
	place-items: center;
	font-size: 36px;
	font-weight: 700;
	overflow: hidden;
	box-shadow: 0 0 40px color-mix(in srgb, var(--accent) 40%, transparent);
}
.ico img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.title {
	font-size: 12px;
	letter-spacing: 0.2em;
	text-transform: uppercase;
	color: var(--text-dim);
	margin-bottom: 6px;
}
.name {
	font-family: var(--font-head);
	font-size: 22px;
	font-weight: 700;
	margin-bottom: 18px;
}
.bar {
	width: 160px;
	height: 4px;
	margin: 0 auto;
	border-radius: 4px;
	background: var(--surface-2);
	overflow: hidden;
}
.bar i {
	display: block;
	height: 100%;
	width: 0;
	border-radius: 4px;
	background: linear-gradient(90deg, var(--accent), var(--accent-2));
	animation: load 1.6s ease-in-out forwards;
}

@keyframes burst {
	0% {
		transform: scale(0.1);
		opacity: 0.8;
	}
	100% {
		transform: scale(1);
		opacity: 0;
	}
}
@keyframes ring {
	0% {
		transform: scale(0.4);
		opacity: 0.9;
	}
	100% {
		transform: scale(2.4);
		opacity: 0;
	}
}
@keyframes pop {
	from {
		transform: scale(0.85);
		opacity: 0;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}
@keyframes load {
	0% {
		width: 0;
	}
	70% {
		width: 85%;
	}
	100% {
		width: 100%;
	}
}

.launch-enter-active,
.launch-leave-active {
	transition: opacity 0.35s ease;
}
.launch-enter-from,
.launch-leave-to {
	opacity: 0;
}
</style>
