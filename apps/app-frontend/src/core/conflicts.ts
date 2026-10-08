/**
 * Lightweight mod conflict heuristics (no network).
 * Uses known incompatible pairs by Modrinth project id / name keywords.
 */
import type { ContentItem } from './api'

/** Known conflicting pairs (either project id or slug/title keyword) */
const PAIRS: [string, string, string][] = [
	// [a, b, reason]
	['sodium', 'optifine', 'Sodium и OptiFine несовместимы'],
	['sodium', 'rubidium', 'Sodium и Rubidium/Oculus-стек конфликтуют'],
	['iris', 'optifine', 'Iris и OptiFine несовместимы'],
	['iris', 'oculus', 'Iris (Fabric) и Oculus (Forge) — разные лоадеры'],
	['lithium', 'canary', 'Lithium и Canary перекрывают оптимизации'],
	['entityculling', 'entity-culling', 'Дубликат Entity Culling'],
	['modmenu', 'catalogue', 'Mod Menu и Catalogue — оба меню модов'],
	['ferritecore', 'modernfix', 'Возможны конфликты оптимизации памяти'],
	['immediatelyfast', 'reeses-sodium-options', 'Проверьте совместимость UI-оверлеев'],
	['fabric-api', 'quilted-fabric-api', 'Fabric API и Quilted Fabric API вместе не ставят'],
	['forge', 'fabric-api', 'Смешение Forge/Fabric API в одной сборке'],
]

function keyOf(item: ContentItem): string {
	const id = (item.project?.id || '').toLowerCase()
	const slug = (item.project?.slug || '').toLowerCase()
	const title = (item.project?.title || item.file_name || '').toLowerCase()
	const file = item.file_name.toLowerCase()
	return [id, slug, title, file].join(' ')
}

export interface ConflictWarning {
	a: string
	b: string
	reason: string
}

export function findConflicts(items: ContentItem[]): ConflictWarning[] {
	const enabled = items.filter((i) => i.enabled && (i.project_type === 'mod' || !i.project_type))
	const out: ConflictWarning[] = []
	const seen = new Set<string>()

	// duplicate project ids
	const byId = new Map<string, ContentItem[]>()
	for (const it of enabled) {
		const pid = it.project?.id
		if (!pid) continue
		const arr = byId.get(pid) ?? []
		arr.push(it)
		byId.set(pid, arr)
	}
	for (const [, arr] of byId) {
		if (arr.length > 1) {
			const names = arr.map((x) => x.project?.title ?? x.file_name)
			const reason = `Дубликат мода: ${names.join(' + ')}`
			const k = 'dup:' + arr[0].project!.id
			if (!seen.has(k)) {
				seen.add(k)
				out.push({ a: names[0], b: names[1], reason })
			}
		}
	}

	for (let i = 0; i < enabled.length; i++) {
		for (let j = i + 1; j < enabled.length; j++) {
			const A = enabled[i]
			const B = enabled[j]
			const ka = keyOf(A)
			const kb = keyOf(B)
			for (const [x, y, reason] of PAIRS) {
				const hit =
					(ka.includes(x) && kb.includes(y)) || (ka.includes(y) && kb.includes(x))
				if (hit) {
					const k = [x, y].sort().join('|')
					if (seen.has(k)) continue
					seen.add(k)
					out.push({
						a: A.project?.title ?? A.file_name,
						b: B.project?.title ?? B.file_name,
						reason,
					})
				}
			}
		}
	}
	return out
}
