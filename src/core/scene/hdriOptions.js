import { hdriFiles } from 'virtual:hdri-options'

function filenameFromPath(path) {
  return (
    path
      .split('/')
      .pop()
      ?.replace(/\.(hdr|exr)$/i, '') ?? path
  )
}

function labelFromFilename(filename) {
  return filename.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export const HDRI_OPTIONS = hdriFiles.map((path) => {
  const filename = filenameFromPath(path)

  return {
    id: filename.toLowerCase(),
    label: labelFromFilename(filename),
    file: path,
    intensity: 0.8,
  }
})

export const NO_HDRI_ID = 'original-lighting'
export const DEFAULT_HDRI_ID = NO_HDRI_ID

const ORIGINAL_LIGHTING_OPTION = {
  id: NO_HDRI_ID,
  label: 'Lumieres originales',
  preset: 'apartment',
}

export function getHdriOption(id) {
  if (id === NO_HDRI_ID) return ORIGINAL_LIGHTING_OPTION

  return HDRI_OPTIONS.find((option) => option.id === id) ?? ORIGINAL_LIGHTING_OPTION
}
