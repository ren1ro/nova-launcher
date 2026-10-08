// Тонкая обёртка над Tauri-командами ядра Theseus (apps/app + packages/app-lib).
// Вся логика (авторизация, инстансы, запуск) остаётся в Rust.
import { Channel, convertFileSrc, invoke } from '@tauri-apps/api/core'

export type InstallStage =
	| 'installed'
	| 'minecraft_installing'
	| 'pack_installed'
	| 'pack_installing'
	| 'not_installed'

export interface Instance {
	id: string
	path: string
	install_stage: InstallStage
	name: string
	icon_path?: string | null
	game_version: string
	loader: 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge'
	loader_version?: string
	group_ids: string[]
	created: string
	modified: string
	last_played?: string | null
	submitted_time_played: number
	recent_time_played: number
	link?: unknown
}

export interface Credentials {
	profile: { id: string; name: string }
	access_token: string
	refresh_token: string
	expires: string
	active: boolean
}

export interface ProcessMeta {
	uuid: string
	instance_id: string
	instance_name: string
	start_time: string
}

export interface AppSettings {
	max_concurrent_downloads: number
	memory: { maximum: number }
	game_resolution: [number, number]
	force_fullscreen: boolean
	hide_on_process_start: boolean
	extra_launch_args: string[]
	custom_env_vars: [string, string][]
	custom_dir?: string | null
	[key: string]: unknown
}

export function errMsg(e: unknown): string {
	if (e instanceof Error) return e.message
	if (typeof e === 'string') return e
	if (e && typeof e === 'object') {
		const r = e as Record<string, unknown>
		if (typeof r.message === 'string') return r.message
		if (typeof r.error === 'string') return r.error
		try {
			return JSON.stringify(e)
		} catch {
			/* ignore */
		}
	}
	return String(e)
}

export const initializeState = (events: Channel<ArrayBuffer>) =>
	invoke<void>('initialize_state', { events })
export const showWindow = () => invoke<void>('show_window')

// --- инстансы ---
export const listInstances = () => invoke<Instance[]>('plugin:instance|instance_list')
export const runInstance = (instanceId: string) =>
	invoke<unknown>('plugin:instance|instance_run', { instanceId, serverAddress: null })
export const killInstance = (instanceId: string) =>
	invoke<void>('plugin:instance|instance_kill', { instanceId })
export const getInstancePath = (instanceId: string) =>
	invoke<string>('plugin:instance|instance_get_full_path', { instanceId })
export const instanceIconUrl = (p?: string | null) =>
	!p ? null : p.startsWith('http') ? p : convertFileSrc(p)

// --- процессы ---
export const listProcesses = () => invoke<ProcessMeta[]>('plugin:process|process_get_all')
export const killProcess = (uuid: string) => invoke<void>('plugin:process|process_kill', { uuid })

// --- авторизация (Microsoft через Theseus) ---
export const login = () => invoke<Credentials | null>('plugin:auth|login')
export const getUsers = () => invoke<Credentials[]>('plugin:auth|get_users')
export const getDefaultUser = () => invoke<string | null>('plugin:auth|get_default_user')
export const setDefaultUser = (user: string) => invoke<void>('plugin:auth|set_default_user', { user })
export const removeUser = (user: string) => invoke<void>('plugin:auth|remove_user', { user })

// --- настройки ---
export const getSettings = () => invoke<AppSettings>('plugin:settings|settings_get')
export const setSettings = (settings: AppSettings) =>
	invoke<void>('plugin:settings|settings_set', { settings })

// ================= создание сборок / установка =================
export type Loader = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge'

export interface InstallJob {
	job_id: string
	instance_id: string | null
	status: 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted' | 'canceled'
	progress: { current: number; total: number } | null
	display: { title: string; icon: string | null } | null
	error: { message: string } | null
	target?: { instance_id?: string | null }
}

export const jobFinished = (s: InstallJob['status']) =>
	s === 'succeeded' || s === 'failed' || s === 'interrupted' || s === 'canceled'

export const createInstance = (req: {
	name: string
	gameVersion: string
	loader: Loader
	loaderVersion: string | null
}) =>
	invoke<InstallJob>('plugin:install|install_create_instance', {
		request: { ...req, iconPath: null, iconConfig: null, link: null },
	})

export const createModpackInstance = (loc: {
	project_id: string
	version_id: string
	title: string
	icon_url?: string | null
}) =>
	invoke<InstallJob>('plugin:install|install_create_modpack_instance', {
		location: { type: 'fromVersionId', ...loc },
		postInstallEdit: null,
	})

export const duplicateInstance = (sourceInstanceId: string) =>
	invoke<InstallJob>('plugin:install|install_duplicate_instance', { sourceInstanceId })
export const repairInstance = (instanceId: string) =>
	invoke<InstallJob>('plugin:install|install_existing_instance', { instanceId, force: true })
export const removeInstance = (instanceId: string) =>
	invoke<void>('plugin:instance|instance_remove', { instanceId })
export const renameInstance = (instanceId: string, name: string) =>
	invoke<void>('plugin:instance|instance_edit', { instanceId, editInstance: { name } })

// ================= метаданные версий =================
export interface GameVersionEntry {
	id: string
	type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
}
export const getGameVersions = () =>
	invoke<{ latest: { release: string; snapshot: string }; versions: GameVersionEntry[] }>(
		'plugin:metadata|metadata_get_game_versions',
	)

interface LoaderVer {
	id: string
	stable: boolean
}
interface LoaderManifest {
	gameVersions: { id: string; versionGroup?: string; loaders: LoaderVer[] }[]
	versionGroups?: { id: string; loaders: LoaderVer[] }[]
}
const manifestName = (l: Loader) => (l === 'neoforge' ? 'neo' : l)

/** Версии загрузчика для конкретной версии игры (новые — первыми) */
export async function getLoaderVersions(loader: Loader, gameVersion: string): Promise<LoaderVer[]> {
	if (loader === 'vanilla') return []
	const m = await invoke<LoaderManifest>('plugin:metadata|metadata_get_loader_versions', {
		loader: manifestName(loader),
	})
	const gv = m.gameVersions.find((v) => v.id === gameVersion)
	if (!gv) return []
	if (gv.loaders?.length) return gv.loaders
	const grp = m.versionGroups?.find((g) => g.id === gv.versionGroup)
	return grp?.loaders ?? []
}

/** Список версий игры, для которых у загрузчика есть сборки */
export async function getSupportedGameVersions(loader: Loader): Promise<Set<string> | null> {
	if (loader === 'vanilla') return null
	const m = await invoke<LoaderManifest>('plugin:metadata|metadata_get_loader_versions', {
		loader: manifestName(loader),
	})
	return new Set(
		m.gameVersions.filter((v) => v.loaders?.length || v.versionGroup).map((v) => v.id),
	)
}

// ================= содержимое сборки =================
export interface ContentItem {
	file_name: string
	file_path: string
	id: string
	size: number
	enabled: boolean
	locked: boolean
	project_type: string
	project: { id: string; slug?: string | null; title: string; icon_url?: string | null } | null
	version: { id: string; version_number: string; file_name: string } | null
	has_update: boolean
	update_version_id: string | null
	embedded_metadata?: { name?: string | null; version?: string | null } | null
}
export const getContentItems = (instanceId: string) =>
	invoke<ContentItem[]>('plugin:instance|instance_get_content_items', {
		instanceId,
		cacheBehaviour: 'stale_while_revalidate_skip_offline',
	})
export const toggleContent = (instanceId: string, projectPath: string, desiredEnabled?: boolean) =>
	invoke<string>('plugin:instance|instance_toggle_disable_project', {
		instanceId,
		projectPath,
		desiredEnabled,
	})
export const removeContent = (instanceId: string, projectPath: string) =>
	invoke<void>('plugin:instance|instance_remove_project', { instanceId, projectPath })
export const updateAllContent = (
	instanceId: string,
	updates: { project_path: string; version_id: string }[],
) => invoke<InstallJob>('plugin:install|install_bulk_update_content', { instanceId, updates })

export type ContentType = 'mod' | 'datapack' | 'resourcepack' | 'shader' | 'modpack'
/** Установка проекта вместе с зависимостями (ядро само подбирает версию под сборку) */
export const installProject = (
	instanceId: string,
	projectId: string,
	contentType: ContentType,
	gameVersion: string,
	loader: Loader,
) =>
	invoke<{ primary: { project_id: string; version_id: string }; dependencies: unknown[] }>(
		'plugin:instance|instance_install_project_with_dependencies',
		{
			instanceId,
			request: {
				project_id: projectId,
				version_id: null,
				content_type: contentType,
				selected: {
					game_versions: [gameVersion],
					loaders: contentType === 'mod' && loader !== 'vanilla' ? [loader] : undefined,
				},
			},
		},
	)

// ================= прочее =================
export const createModpackFromFile = (path: string) =>
	invoke<InstallJob>('plugin:install|install_create_modpack_instance', {
		location: { type: 'fromFile', path },
		postInstallEdit: null,
	})
export const cancelJob = (jobId: string) => invoke<InstallJob>('plugin:install|install_job_cancel', { jobId })
export const getInstalledProjectIds = (instanceId: string) =>
	invoke<string[]>('plugin:instance|instance_get_installed_project_ids', { instanceId })
export const addProjectFromVersion = (
	instanceId: string,
	versionId: string,
	reason: 'standalone' | 'dependency' = 'standalone',
) => invoke<string>('plugin:instance|instance_add_project_from_version', { instanceId, versionId, reason })
export const addProjectFromPath = (instanceId: string, projectPath: string) =>
	invoke<string>('plugin:instance|instance_add_project_from_path', { instanceId, projectPath })
export const updateProject = (instanceId: string, projectPath: string) =>
	invoke<string>('plugin:instance|instance_update_project', { instanceId, projectPath })


// ================= export / window =================
export const hideWindow = () => invoke<void>('hide_window').catch(() =>
	invoke<void>('plugin:window|hide').catch(async () => {
		const { getCurrentWindow } = await import('@tauri-apps/api/window')
		await getCurrentWindow().hide()
	}),
)

/** Export instance as .mrpack — tries several Theseus command names */
export async function exportMrpack(
	instanceId: string,
	exportPath: string,
	overrides: string[] = [],
	versionId?: string,
): Promise<void> {
	const attempts: Array<() => Promise<unknown>> = [
		() =>
			invoke('plugin:instance|instance_export_mrpack', {
				instanceId,
				exportLocation: exportPath,
				export_location: exportPath,
				includedOverrides: overrides,
				included_overrides: overrides,
				versionId: versionId ?? null,
				version_id: versionId ?? null,
			}),
		() =>
			invoke('plugin:instance|export_mrpack', {
				instanceId,
				path: instanceId,
				exportLocation: exportPath,
				includedOverrides: overrides,
				versionId: versionId ?? null,
			}),
		() =>
			invoke('profile_export_mrpack', {
				path: instanceId,
				exportLocation: exportPath,
				includedOverrides: overrides,
				versionId: versionId ?? null,
			}),
	]
	let last: unknown
	for (const fn of attempts) {
		try {
			await fn()
			return
		} catch (e) {
			last = e
		}
	}
	throw last instanceof Error ? last : new Error(String(last))
}

export async function getPackExportCandidates(instanceId: string): Promise<string[]> {
	const attempts = [
		() => invoke<string[]>('plugin:instance|instance_get_pack_export_candidates', { instanceId }),
		() => invoke<string[]>('plugin:instance|get_pack_export_candidates', { instanceId }),
		() => invoke<string[]>('profile_get_pack_export_candidates', { profilePath: instanceId, path: instanceId }),
	]
	for (const fn of attempts) {
		try {
			const r = await fn()
			if (Array.isArray(r)) return r.map(String)
		} catch {
			/* try next */
		}
	}
	return []
}
