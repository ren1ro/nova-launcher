// Каталог модов: публичный API Modrinth (разрешён в CSP: https://*.modrinth.com).
// Скачивание и установка файлов выполняется ядром Theseus, а не этим кодом.
import * as api from './api'

const API = 'https://api.modrinth.com/v2'

export type ProjectKind = 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'datapack'

export interface Hit {
	project_id: string
	slug: string
	title: string
	description: string
	icon_url: string | null
	author: string
	downloads: number
	follows: number
	project_type: ProjectKind
	categories: string[]
	versions: string[]
}
export interface SearchResponse {
	hits: Hit[]
	offset: number
	limit: number
	total_hits: number
}
export interface MrVersion {
	id: string
	project_id: string
	name: string
	version_number: string
	game_versions: string[]
	loaders: string[]
	date_published: string
	dependencies: { version_id: string | null; project_id: string | null; dependency_type: string }[]
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
	const url = new URL(API + path)
	for (const [k, v] of Object.entries(params)) if (v !== '') url.searchParams.set(k, v)
	const r = await fetch(url.toString())
	if (!r.ok) throw new Error(`Modrinth API: ${r.status} ${r.statusText}`)
	return (await r.json()) as T
}

/** Загрузчики, которыми можно ставить моды в сборку с данным загрузчиком */
export function modLoadersFor(loader: api.Loader): string[] {
	if (loader === 'vanilla') return []
	if (loader === 'quilt') return ['quilt', 'fabric']
	return [loader]
}

export async function search(opts: {
	query: string
	kind: ProjectKind
	index: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'
	offset: number
	gameVersion?: string
	loader?: api.Loader
	limit?: number
}): Promise<SearchResponse> {
	const facets: string[][] = [[`project_type:${opts.kind}`]]
	if (opts.gameVersion) facets.push([`versions:${opts.gameVersion}`])
	if (opts.kind === 'mod' && opts.loader && opts.loader !== 'vanilla') {
		facets.push(modLoadersFor(opts.loader).map((l) => `categories:${l}`))
	}
	return get<SearchResponse>('/search', {
		query: opts.query,
		facets: JSON.stringify(facets),
		index: opts.index,
		offset: String(opts.offset),
		limit: String(opts.limit ?? 20),
	})
}

export async function projectVersions(
	projectId: string,
	opts: { gameVersion?: string; loaders?: string[] } = {},
): Promise<MrVersion[]> {
	const params: Record<string, string> = {}
	if (opts.gameVersion) params.game_versions = JSON.stringify([opts.gameVersion])
	if (opts.loaders && opts.loaders.length) params.loaders = JSON.stringify(opts.loaders)
	return get<MrVersion[]>(`/project/${projectId}/version`, params)
}

export const getVersion = (id: string) => get<MrVersion>(`/version/${id}`)

/**
 * Ставит проект в сборку (через ядро) вместе с обязательными зависимостями.
 * Возвращает список установленных названий для уведомления.
 */
export async function installIntoInstance(
	inst: api.Instance,
	projectId: string,
	kind: ProjectKind,
): Promise<{ installed: number; warnings: string[] }> {
	const loaders = kind === 'mod' ? modLoadersFor(inst.loader) : undefined
	if (kind === 'mod' && inst.loader === 'vanilla') {
		throw new Error('В сборке Vanilla моды не работают. Создайте сборку с Fabric, Forge, Quilt или NeoForge.')
	}
	const have = new Set(await api.getInstalledProjectIds(inst.id))
	const warnings: string[] = []
	let installed = 0

	const pickVersion = async (pid: string): Promise<MrVersion | null> => {
		const list = await projectVersions(pid, { gameVersion: inst.game_version, loaders })
		return list[0] ?? null
	}

	const install = async (v: MrVersion, reason: 'standalone' | 'dependency', depth: number) => {
		if (have.has(v.project_id) && reason === 'dependency') return
		await api.addProjectFromVersion(inst.id, v.id, reason)
		have.add(v.project_id)
		installed++
		if (kind !== 'mod' || depth > 4) return
		for (const d of v.dependencies) {
			if (d.dependency_type !== 'required') continue
			try {
				if (d.project_id && have.has(d.project_id)) continue
				let dv: MrVersion | null = null
				if (d.version_id) dv = await getVersion(d.version_id)
				else if (d.project_id) dv = await pickVersion(d.project_id)
				if (!dv) {
					warnings.push(`Не найдена совместимая зависимость (${d.project_id ?? d.version_id})`)
					continue
				}
				await install(dv, 'dependency', depth + 1)
			} catch (e) {
				warnings.push(`Зависимость не установлена: ${api.errMsg(e)}`)
			}
		}
	}

	const v = await pickVersion(projectId)
	if (!v) {
		throw new Error(`Нет версии для Minecraft ${inst.game_version}${loaders ? ' / ' + inst.loader : ''}`)
	}
	await install(v, 'standalone', 0)
	return { installed, warnings }
}

/** Ставит модпак как новую сборку (самая свежая версия) */
export async function installModpack(hit: Hit): Promise<api.InstallJob> {
	const list = await projectVersions(hit.project_id)
	const v = list[0]
	if (!v) throw new Error('У модпака нет доступных версий')
	return api.createModpackInstance({
		project_id: hit.project_id,
		version_id: v.id,
		title: hit.title,
		icon_url: hit.icon_url,
	})
}
