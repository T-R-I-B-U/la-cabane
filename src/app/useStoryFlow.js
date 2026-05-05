import { useCallback, useMemo, useState } from 'react'
import { STORY_SCRIPT, STORY_START_STEP } from './storyScript'

export function useStoryFlow() {
  const [currentStepId, setCurrentStepId] = useState(null)

  const currentStep = useMemo(() => {
    if (!currentStepId) return null
    return STORY_SCRIPT[currentStepId] ?? null
  }, [currentStepId])

  const startStory = useCallback((stepId = STORY_START_STEP) => {
    setCurrentStepId(stepId)
  }, [])

  const goToStep = useCallback((stepId) => {
    setCurrentStepId(stepId ?? null)
  }, [])

  const completeStep = useCallback((stepId) => {
    setCurrentStepId((current) => {
      if (current !== stepId) return current
      return STORY_SCRIPT[current]?.next ?? null
    })
  }, [])

  const resetStory = useCallback(() => {
    setCurrentStepId(null)
  }, [])

  return {
    currentStep,
    currentStepId,
    objective: currentStep?.objective ?? null,
    completeStep,
    goToStep,
    resetStory,
    startStory,
  }
}
