import { useState, useCallback, useEffect, useRef } from 'react'
import { Crosshair } from './app/Crosshair'
import { IntroLoader } from './app/IntroLoader'
import { NameInput } from './app/NameInput'
import { ViewerControls } from './app/ViewerControls'
import Scene from './core/Scene'
import { getPlatformSpawn } from './core/SceneConfig'
import { PerfMonitor } from './core/PerfMonitor'
import Subtitles from './core/audio/Subtitles'
import { playDialogue as _playDialogue, stopDialogue } from './utils/audioStore'
import './App.css'

const STATS_INIT = { fps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 }

export default function App() {
  const [stats, setStats] = useState(STATS_INIT)
  const [status, setStatus] = useState('loading')
  const [info, setInfo] = useState(null)
  const [playerMode, setPlayerMode] = useState(false)
  const [debugDoors, setDebugDoors] = useState(false)
  const [debugCollisions, setDebugCollisions] = useState(false)
  const [showUI, setShowUI] = useState(true)
  const [introActive, setIntroActive] = useState(false)
  const [introDoorOpen, setIntroDoorOpen] = useState(false)
  const [introWaitingAtDoor, setIntroWaitingAtDoor] = useState(false)
  const [introShouldAdvance, setIntroShouldAdvance] = useState(false)
  const [introPending, setIntroPending] = useState(false)
  const [postIntro, setPostIntro] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [loaderFading, setLoaderFading] = useState(false)
  const [marieClip, setMarieClip] = useState('marie-standiing-idle')
  const [thomasClip, setThomasClip] = useState('thomas-front')
  const [npcHovered, setNpcHovered] = useState(false)
  const [dialogueActive, setDialogueActive] = useState(false)
  const [introMovementLocked, setIntroMovementLocked] = useState(false)
  const [playerSpawn, setPlayerSpawn] = useState(null)
  const [playerSpawnKey, setPlayerSpawnKey] = useState(0)
  const [userMovementLocked, setUserMovementLocked] = useState(false)
  const ignoreNextPointerUnlockRef = useRef(false)
  const sceneReady = status === 'ok'

  const exitIntro = useCallback(() => {
    setIntroActive(false)
    setIntroPending(false)
    setPostIntro(false)
    setShowNameInput(false)
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setDialogueActive(false)
    setIntroMovementLocked(false)
    ignoreNextPointerUnlockRef.current = false
    stopDialogue()
  }, [])

  // Wrapper local : ajoute la gestion de dialogueActive autour de la lecture SRT
  function playDialogue(id, { onDone } = {}) {
    setDialogueActive(true)
    _playDialogue(id, {
      onDone: () => {
        setDialogueActive(false)
        onDone?.()
      },
    })
  }

  // ESC → exit any intro state; F1 → toggle UI
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'F1') {
        e.preventDefault()
        setShowUI((v) => !v)
      }
      if (e.code === 'Escape') exitIntro()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exitIntro])

  // When pointer unlocks in postIntro (user pressed ESC while locked) → exit
  useEffect(() => {
    if (!postIntro) return
    let wasLocked = false
    const onChange = () => {
      if (document.pointerLockElement) wasLocked = true
      else if (ignoreNextPointerUnlockRef.current) {
        ignoreNextPointerUnlockRef.current = false
      } else if (wasLocked) {
        exitIntro()
      }
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [postIntro, exitIntro])

  // Hide cursor during cinematic movement, show it when waiting at door
  useEffect(() => {
    const hide = introActive && !introWaitingAtDoor
    document.body.style.cursor = hide ? 'none' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [introActive, introWaitingAtDoor])

  // Unlock pointer and freeze camera when name input appears
  useEffect(() => {
    if (showNameInput && document.pointerLockElement) {
      ignoreNextPointerUnlockRef.current = true
      document.exitPointerLock()
    }
  }, [showNameInput])

  const onReady = useCallback((data) => {
    setInfo(data)
    setStatus('ok')
  }, [])
  const onError = useCallback((msg) => {
    setInfo(msg)
    setStatus('error')
  }, [])

  function handleIntroEvent(event) {
    if (event === 'wait:door') setIntroWaitingAtDoor(true)
    if (event === 'door:clicked') {
      setIntroWaitingAtDoor(false)
      setIntroShouldAdvance(true)
    }
    if (event === 'door:open') setIntroDoorOpen(true)
    if (event === 'inside') {
      setIntroDoorOpen(false)
      setIntroShouldAdvance(false)
      setIntroActive(false)
      setPostIntro(true)
      setIntroMovementLocked(true)
      playDialogue('dialogue1', {
        onDone: () => setShowNameInput(true),
      })
    }
  }

  function handleNpcInteract(id) {
    if (dialogueActive || introMovementLocked || showNameInput) return

    playDialogue(id === 'marie' ? 'marieDialogue' : 'thomasDialogue')
  }

  function handleNameSubmit() {
    setShowNameInput(false)
    setIntroMovementLocked(true)
    playDialogue('dialogue2', {
      onDone: () => setIntroMovementLocked(false),
    })
  }

  function goToPlatform() {
    setPostIntro(false)
    setPlayerSpawn(getPlatformSpawn())
    setPlayerSpawnKey((k) => k + 1)
    setUserMovementLocked(true)
    setPlayerMode(true)
  }

  function launchIntro() {
    if (!sceneReady) return
    setPostIntro(false)
    setShowNameInput(false)
    ignoreNextPointerUnlockRef.current = false
    setIntroPending(true)
  }

  function handleLoaderClick() {
    if (!sceneReady || loaderFading) return
    // Start the cinematic immediately so it plays under the fading loader.
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setIntroActive(true)
    setLoaderFading(true)
  }

  function handleLoaderKeyDown(event) {
    if (loaderFading || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    handleLoaderClick()
  }

  function dismissLoader() {
    // Called when fade-out ends — just unmount the loader.
    setLoaderFading(false)
    setIntroPending(false)
  }

  return (
    <main className="viewer-page">
      <Subtitles />

      <Crosshair visible={(playerMode || postIntro) && !showNameInput} active={npcHovered} />

      <Scene
        onStats={setStats}
        onReady={onReady}
        onError={onError}
        playerMode={playerMode}
        debugDoors={debugDoors}
        debugCollisions={debugCollisions}
        introActive={introActive}
        introDoorOpen={introDoorOpen}
        introWaitingAtDoor={introWaitingAtDoor}
        introShouldAdvance={introShouldAdvance}
        postIntro={postIntro}
        postIntroLocked={!showNameInput}
        movementLocked={introMovementLocked || userMovementLocked}
        interactionLocked={dialogueActive || introMovementLocked || showNameInput}
        onIntroEvent={handleIntroEvent}
        marieClip={marieClip}
        thomasClip={thomasClip}
        onNpcInteract={handleNpcInteract}
        onNpcHover={setNpcHovered}
        playerSpawn={playerSpawn}
        playerSpawnKey={playerSpawnKey}
      />

      {import.meta.env.DEV && showUI && <PerfMonitor stats={stats} scene={info} status={status} />}

      {showUI && !introPending && !introActive && !postIntro && (
        <ViewerControls
          status={status}
          info={info}
          sceneReady={sceneReady}
          introPending={introPending}
          introActive={introActive}
          playerMode={playerMode}
          userMovementLocked={userMovementLocked}
          marieClip={marieClip}
          thomasClip={thomasClip}
          debugDoors={debugDoors}
          debugCollisions={debugCollisions}
          onLaunchIntro={launchIntro}
          onTogglePlayerMode={() => {
            setPlayerMode((current) => !current)
            setUserMovementLocked(false)
            setPostIntro(false)
          }}
          onGoToPlatform={goToPlatform}
          onToggleUserMovement={() => setUserMovementLocked((locked) => !locked)}
          onSelectMarieClip={setMarieClip}
          onSelectThomasClip={setThomasClip}
          onToggleDebugDoors={() => setDebugDoors((current) => !current)}
          onToggleDebugCollisions={() => setDebugCollisions((current) => !current)}
        />
      )}

      {showNameInput && <NameInput onSubmit={handleNameSubmit} />}

      {introPending && (
        <IntroLoader
          fading={loaderFading}
          onClick={handleLoaderClick}
          onKeyDown={handleLoaderKeyDown}
          onAnimationEnd={dismissLoader}
        />
      )}
    </main>
  )
}
