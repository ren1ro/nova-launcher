
/**
 * Discord Rich Presence — best effort without extra Rust crates:
 * 1) Window title (visible in taskbar / some overlays)
 * 2) Try Theseus/Tauri commands if present
 * 3) localStorage state for UI
 */
import { discordRpc } from './features'

export type Activity = {
	details: string
	state: string
	instanceName?: string
	loader?: string
	gameVersion?: string
} | null

let current: Activity = null

export function getActivity(): Activity {
	return current
}

async function setWindowTitle(title: string) {
	try {
		const { getCurrentWindow } = await import('@tauri-apps/api/window')
		await getCurrentWindow().setTitle(title)
	} catch {
		try {
			document.title = title
		} catch {
			/* ignore */
		}
	}
}

async function tryInvokeActivity(act: Activity) {
	const payloads = act
		? {
				details: act.details,
				state: act.state,
				large_image_key: 'nova',
				large_image_text: 'Nova Launcher',
			}
		: null
	const attempts = [
		() => import('@tauri-apps/api/core').then(({ invoke }) => invoke('set_discord_activity', { activity: payloads })),
		() => import('@tauri-apps/api/core').then(({ invoke }) => invoke('plugin:discord|set_activity', { activity: payloads })),
		() => import('@tauri-apps/api/core').then(({ invoke }) => invoke('discord_set_activity', { activity: payloads })),
	]
	for (const fn of attempts) {
		try {
			await fn()
			return true
		} catch {
			/* next */
		}
	}
	return false
}

/** Call when starting a game */
export async function setPlayingActivity(opts: {
	instanceName: string
	loader?: string
	gameVersion?: string
}) {
	if (!discordRpc.value.enabled) return
	const loader = opts.loader || 'Minecraft'
	const ver = opts.gameVersion || ''
	const state = ver ? `${loader} ${ver}` : loader
	current = {
		details: `Играет · ${opts.instanceName}`,
		state: `Nova · ${state}`,
		instanceName: opts.instanceName,
		loader: opts.loader,
		gameVersion: opts.gameVersion,
	}
	await setWindowTitle(`Nova · ${opts.instanceName}${ver ? ` · ${loader} ${ver}` : ''}`)
	await tryInvokeActivity(current)
}

/** Idle / launcher open */
export async function clearActivity() {
	current = null
	if (!discordRpc.value.enabled) {
		await setWindowTitle('Nova Launcher')
		return
	}
	await setWindowTitle('Nova Launcher')
	await tryInvokeActivity(null)
}

export async function setIdleActivity() {
	if (!discordRpc.value.enabled) {
		await setWindowTitle('Nova Launcher')
		return
	}
	current = { details: 'В лаунчере', state: 'Nova Launcher' }
	await setWindowTitle('Nova Launcher')
	await tryInvokeActivity(current)
}
