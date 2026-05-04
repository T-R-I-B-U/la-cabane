import { useEffect } from 'react'
import { getGameStep, setGameStep, GAME_STEPS } from '../utils'

/**
 * Orchestrateur logique — ne rend rien dans le DOM.
 *
 * Rôle : observer l'état de la scène et de l'intro pour faire avancer
 * le game step global, puis notifier App via onStepChange.
 *
 * C'est App qui décide quoi faire à chaque transition (audio, UI, etc.).
 * GameManager ne connaît pas les sous-systèmes — il ne fait que piloter l'état.
 *
 * Flow des étapes :
 *   LOADING → scène R3F chargée → INIT
 *   INIT    → utilisateur lance l'histoire → INTRO
 *   INTRO   → dialogue2 terminé + mouvement débloqué → EXPLORATION
 *
 * Props :
 *   sceneReady       – true quand CabaneScene appelle onSceneReady (modèles chargés)
 *   introPending     – IntroLoader visible, attente du clic utilisateur
 *   introActive      – séquence caméra intro en cours
 *   postIntro        – à l'intérieur de la cabane, phase dialogue / saisie du prénom
 *   explorationReady – postIntro && !showNameInput && !dialogueActive && !introMovementLocked
 *   onStepChange     – callback(step: GameStep) appelé à chaque transition
 */
export function GameManager({
  sceneReady,
  introPending,
  introActive,
  postIntro,
  explorationReady,
  onStepChange,
}) {
  // LOADING → INIT : les assets 3D sont prêts, on peut afficher le bouton "Lancer l'histoire"
  useEffect(() => {
    if (sceneReady && getGameStep() === GAME_STEPS.LOADING) {
      setGameStep(GAME_STEPS.INIT)
      onStepChange?.(GAME_STEPS.INIT)
    }
  }, [sceneReady, onStepChange])

  // INIT → INTRO : l'utilisateur a cliqué sur IntroLoader (geste = AudioContext débloqué)
  // introPending = bouton cliqué dans ViewerControls mais IntroLoader pas encore cliqué
  // introActive  = clic sur IntroLoader, séquence caméra en cours
  // postIntro    = inside cabane (cas edge : scène rechargée pendant intro)
  useEffect(() => {
    if ((introPending || introActive || postIntro) && getGameStep() === GAME_STEPS.INIT) {
      setGameStep(GAME_STEPS.INTRO)
      onStepChange?.(GAME_STEPS.INTRO)
    }
  }, [introPending, introActive, postIntro, onStepChange])

  // INTRO → EXPLORATION : dialogue2 terminé, mouvement débloqué, joueur libre
  useEffect(() => {
    if (explorationReady && getGameStep() === GAME_STEPS.INTRO) {
      setGameStep(GAME_STEPS.EXPLORATION)
      onStepChange?.(GAME_STEPS.EXPLORATION)
    }
  }, [explorationReady, onStepChange])

  return null
}
