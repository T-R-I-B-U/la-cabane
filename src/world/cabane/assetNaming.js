export function modelBaseName(name) {
  if (/^window0[23]$/i.test(name)) return 'window01'

  return name.replace(/_\d+$/, '')
}

export function normalizeAssetName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function assetModelCandidates(name) {
  const candidates = [name]
  const normalized = normalizeAssetName(name).replaceAll('-', '')
  if (normalized && !candidates.includes(normalized)) candidates.push(normalized)
  return candidates
}
