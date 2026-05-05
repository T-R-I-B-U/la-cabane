import { useEffect } from 'react'
import { getGameStep, setGameStep, GAME_STEPS } from '../utils'

/**
 * Orchestrateur logique — ne rend rien dans le DOM.
 *
 * Rôle : observer l'état de la scène et de l'intro pour faire avancer
 * le game step global, puis notifier App via onStepChange.
 *
 * C'est App qui décide quoi faire à chaque transition (audio, UI, visibilité, etc.).
 * GameManager ne connaît pas les sous-systèmes et ne fait que piloter le step global.
 *
 * Flow des étapes :
 *   LOADING → scène R3F chargée → INIT
 *   INIT    → utilisateur lance l'histoire → INTRO
 *   INTRO   → intro narrative terminée → STORY
 *   STORY   → visite guidée terminée → EXPLORATION
 *
 * Props :
 *   sceneReady       – true quand CabaneScene appelle onSceneReady (modèles chargés)
 *   introActive      – séquence caméra intro en cours
 *   postIntro        – à l'intérieur de la cabane, phase dialogue / saisie du prénom
 *   storyReady       – l'objectif "Clique sur l'accueil" peut être affiché
 *   explorationReady – la visite scénarisée est entièrement terminée
 *   onStepChange     – callback(step: GameStep) appelé à chaque transition
 */
export function GameManager({
  sceneReady,
  introActive,
  postIntro,
  storyReady,
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

  // INIT → INTRO : seulement après le vrai geste utilisateur sur IntroLoader.
  // introActive  = clic sur IntroLoader, séquence caméra en cours
  // postIntro    = inside cabane (cas edge : scène rechargée pendant intro)
  useEffect(() => {
    if ((introActive || postIntro) && getGameStep() === GAME_STEPS.INIT) {
      setGameStep(GAME_STEPS.INTRO)
      onStepChange?.(GAME_STEPS.INTRO)
    }
  }, [introActive, postIntro, onStepChange])

  // INTRO → STORY : l'intro narrative est terminée, place aux objectifs guidés.
  useEffect(() => {
    if (storyReady && getGameStep() === GAME_STEPS.INTRO) {
      setGameStep(GAME_STEPS.STORY)
      onStepChange?.(GAME_STEPS.STORY)
    }
  }, [storyReady, onStepChange])

  // STORY → EXPLORATION : la visite guidée est finie, joueur totalement libre.
  useEffect(() => {
    if (explorationReady && getGameStep() === GAME_STEPS.STORY) {
      setGameStep(GAME_STEPS.EXPLORATION)
      onStepChange?.(GAME_STEPS.EXPLORATION)
    }
  }, [explorationReady, onStepChange])

  return null
}
