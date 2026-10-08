import { Channel } from '@tauri-apps/api/core'
import { computed, reactive, ref } from 'vue'

import type { AppEvent } from '../generated/app-events/AppEvent'
import * as api from './api'
import { decodeAppEvent } from './app-event-codec'

export interface Toast {
	id: number
	kind: 'info' | 'error' | 'success'
	text: string
}

export const instances = ref<api.Instance[]>([])
export const users = ref<api.Credentials[]>([])
export const running = reactive<Record<string, string>>({}) // instanceId -> process uuid
export const launching = reactive<Record<string, boolean>>({})
export const progress = reactive<Record<string, { fraction: number; message: string }>>({}) // по instanceId
export const toasts = ref<Toast[]>([])
export const ready = ref(false)
export const fatalError = ref<string | null>(null)

export type View = 'library' | 'browse' | 'instance' | 'accounts' | 'themes' | 'settings' | 'tetris' | 'shop'
export const nav = reactive<{ view: View; instanceId: string | null; browseInstanceId: string | null }>({
	view: 'library',
	instanceId: null,
	browseInstanceId: null,
})
export function go(view: View) {
	nav.view = view
}
export function openInstance(id: string) {
	nav.instanceId = id
	nav.view = 'instance'
}
export function openBrowse(instanceId: string | null = null) {
	nav.browseInstanceId = instanceId
	nav.view = 'browse'
}

// задачи установки (создание сборок, установка модпаков)
export const jobs = reactive<Record<string, api.InstallJob>>({})
const notifiedJobs = new Set<string>()
export function trackJob(j: api.InstallJob) {
	jobs[j.job_id] = j
	if (api.jobFinished(j.status) && !notifiedJobs.has(j.job_id)) {
		notifiedJobs.add(j.job_id)
		if (j.status === 'succeeded') toast('Установка завершена', 'success')
		else if (j.status === 'failed') toast(`Ошибка установки: ${j.error?.message ?? 'неизвестная ошибка'}`, 'error', 9000)
		refreshInstances()
		setTimeout(() => delete jobs[j.job_id], 4000)
	}
}
export function jobFor(instanceId: string): api.InstallJob | undefined {
	return Object.values(jobs).find(
		(j) => (j.instance_id ?? j.target?.instance_id) === instanceId && !api.jobFinished(j.status),
	)
}
export const activeJobs = computed(() => Object.values(jobs).filter((j) => !api.jobFinished(j.status)))

export const activeUser = computed(() => users.value.find((u) => u.active) ?? users.value[0] ?? null)

let toastId = 0
export function toast(text: string, kind: Toast['kind'] = 'info', ms = 4500) {
	// streamer mode: hide notifications
	try {
		const raw = localStorage.getItem('nova.streamer')
		if (raw) {
			const s = JSON.parse(raw) as { enabled?: boolean; hideToasts?: boolean }
			if (s.enabled && s.hideToasts) return
		}
	} catch {
		/* ignore */
	}
	const id = ++toastId
	toasts.value.push({ id, kind, text })
	setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), ms)
}

export async function notifyInstanceCreated() {
	try {
		const { onInstanceCreated } = await import('./economy')
		onInstanceCreated()
	} catch { /* ignore */ }
}

export async function refreshInstances() {
	try {
		instances.value = await api.listInstances()
	} catch (e) {
		toast(`Не удалось получить список сборок: ${api.errMsg(e)}`, 'error')
	}
}

export async function refreshUsers() {
	try {
		users.value = await api.getUsers()
	} catch (e) {
		toast(`Не удалось получить аккаунты: ${api.errMsg(e)}`, 'error')
	}
}

async function refreshRunning() {
	try {
		const procs = await api.listProcesses()
		for (const k of Object.keys(running)) delete running[k]
		for (const p of procs) running[p.instance_id] = p.uuid
	} catch {
		/* ignore */
	}
}

function handleEvent(ev: AppEvent) {
	switch (ev.type) {
		case 'process': {
			const p = ev.payload
			if (p.event === 'launched') {
				running[p.instance_id] = p.uuid
				delete launching[p.instance_id]
				delete progress[p.instance_id]
				void (async () => {
					try {
						const { epicHide } = await import('./features')
						if (epicHide.value.enabled) await api.hideWindow()
					} catch { /* ignore */ }
					try {
						const inst = instances.value.find((i) => i.id === p.instance_id)
						const { setPlayingActivity } = await import('./discord')
						await setPlayingActivity({
							instanceName: inst?.name ?? p.instance_id,
							loader: inst?.loader,
							gameVersion: inst?.game_version,
						})
					} catch { /* ignore */ }
					try {
						const { onInstanceLaunch } = await import('./economy')
						onInstanceLaunch(p.instance_id)
					} catch { /* ignore */ }
				})()
			} else if (p.event === 'finished') {
				delete running[p.instance_id]
				delete launching[p.instance_id]
				refreshInstances()
				void (async () => {
					try {
						const { epicHide } = await import('./features')
						if (epicHide.value.enabled) await api.showWindow()
					} catch { /* ignore */ }
					try {
						const { clearActivity, setIdleActivity } = await import('./discord')
						await clearActivity()
						await setIdleActivity()
					} catch { /* ignore */ }
				})()
			}
			break
		}
		case 'instance': {
			refreshInstances()
			break
		}
		case 'loading': {
			const l = ev.payload
			const t = l.event as { type: string; instance_id?: string }
			if (t.instance_id) {
				const frac = l.fraction ?? 0
				progress[t.instance_id] = { fraction: Math.min(1, frac), message: l.message }
				if (frac >= 1) setTimeout(() => delete progress[t.instance_id!], 1200)
			}
			break
		}
		case 'install_job': {
			trackJob(ev.payload as unknown as api.InstallJob)
			break
		}
		case 'warning': {
			const w = ev.payload as { message?: string }
			if (w?.message) toast(w.message, 'error')
			break
		}
		default:
			break
	}
}

export async function bootstrap() {
	try {
		const channel = new Channel<ArrayBuffer>((payload) => {
			try {
				handleEvent(decodeAppEvent(payload))
			} catch (e) {
				console.warn('event decode failed', e)
			}
		})
		await api.initializeState(channel)
		await Promise.all([refreshInstances(), refreshUsers(), refreshRunning()])
		try {
			const { setIdleActivity } = await import('./discord')
			await setIdleActivity()
		} catch { /* ignore */ }
		try {
			const { initEconomyOnBoot, onPlaytimeSync, bootQuote } = await import('./economy')
			initEconomyOnBoot()
			const total = instances.value.reduce((a, i) => a + (i.submitted_time_played || 0), 0)
			onPlaytimeSync(total)
			if (bootQuote.value) toast(bootQuote.value, 'info', 6000)
		} catch { /* ignore */ }
		ready.value = true
	} catch (e) {
		fatalError.value = api.errMsg(e)
	}
}

export async function play(inst: api.Instance) {
	if (!activeUser.value) {
		toast('Сначала войдите в аккаунт Microsoft (вкладка «Аккаунты»).', 'error')
		return false
	}
	launching[inst.id] = true
	try {
		const { startLaunchAnim, recordLaunch, playLaunchSound } = await import('./features')
		startLaunchAnim(inst.name, api.instanceIconUrl(inst.icon_path))
		recordLaunch(inst)
		playLaunchSound()
	} catch {
		/* optional */
	}
	try {
		await api.runInstance(inst.id)
		return true
	} catch (e) {
		delete launching[inst.id]
		toast(`Не удалось запустить «${inst.name}»: ${api.errMsg(e)}`, 'error', 8000)
		return false
	}
}

export async function stop(inst: api.Instance) {
	try {
		await api.killInstance(inst.id)
	} catch (e) {
		toast(`Не удалось остановить: ${api.errMsg(e)}`, 'error')
	}
}

// ---- избранное (локально, в WebView storage) ----
const FAV_KEY = 'nova.favorites'
function loadFavs(): string[] {
	try {
		return JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
	} catch {
		return []
	}
}
export const favorites = ref<string[]>(loadFavs())
export function toggleFavorite(id: string) {
	favorites.value = favorites.value.includes(id)
		? favorites.value.filter((x) => x !== id)
		: [...favorites.value, id]
	try {
		localStorage.setItem(FAV_KEY, JSON.stringify(favorites.value))
	} catch {
		/* ignore */
	}
}
