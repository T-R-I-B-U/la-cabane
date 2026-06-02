import { getCameraPose, getDefaultCameraPose } from '../core/cameraRegistry'

const CAMERA_ID_BY_KEY = {
  accueil: 'story.accueil',
  apresAccueil: 'story.apres.accueil',
  atelier: 'story.atelier',
  atelierBetween: 'story.atelier.between',
  talkThomas: 'story.thomas',
  treeStory12: 'tree.story.tree.story.12',
  greenhouseFrontDoor: 'story.greenhouseFrontDoor',
  greenhouseCorridor: 'story.greenhouseCorridor',
  greenhouseInside: 'story.greenhouseInside',
  greenhouseInsideExit: 'story.greenhouseInsideExit',
  stairs01Floor: 'story.stairs01Floor',
  stairs01Top: 'story.stairs01Top',
  greenhouseCorridorExit: 'story.greenhouseCorridorExit',
  greenhouseFrontDoorExit: 'story.greenhouseFrontDoorExit',
  serreMiddle: 'story.serreMiddle',
  serreZoe: 'story.serreZoe',
  serreRaspberry: 'story.serreRaspberry',
  serreJuice: 'story.serreJuice',
  serreJuiceDrink: 'story.serreJuiceDrink',
}

const FALLBACK_POVS = {
  stairs02Down: {
    position: { x: -7.685, y: 4.3005, z: 2.2315 },
    target: { x: -23.7066, y: 6.2533, z: 8.2345 },
  },
  stairs02Top: {
    position: { x: -15.5754, y: 12.1331, z: 13.8407 },
    target: { x: -15.8063, y: 12.0721, z: 14.28 },
  },
  nest: {
    position: { x: -20.9313, y: 12.1483, z: 17.147 },
    target: { x: -18.168, y: 8.8642, z: 32.0839 },
  },
}

export const STORY_CAMERA_POVS = new Proxy(FALLBACK_POVS, {
  get(target, key) {
    const cameraId = CAMERA_ID_BY_KEY[key]
    if (!cameraId) return target[key]
    const camera = getCameraPose(cameraId)
    if (!camera?.position || !camera?.target) return target[key]
    return {
      position: camera.position,
      target: camera.target,
      fov: camera.fov,
    }
  },
})

// Reads positions from cameras.json only — never from localStorage.
// Use this for debug/dev shortcuts that must work out of the box on any machine.
export const DEFAULT_STORY_CAMERA_POVS = new Proxy(FALLBACK_POVS, {
  get(target, key) {
    const cameraId = CAMERA_ID_BY_KEY[key]
    if (!cameraId) return target[key]
    const camera = getDefaultCameraPose(cameraId)
    if (!camera?.position || !camera?.target) return target[key]
    return {
      position: camera.position,
      target: camera.target,
      fov: camera.fov,
    }
  },
})
