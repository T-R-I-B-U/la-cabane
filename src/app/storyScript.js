export const STORY_SCRIPT = {
  'intro.treeWelcome': {
    id: 'intro.treeWelcome',
    type: 'dialogue',
    dialogueId: 'dialogue1',
    next: 'intro.nameInput',
  },
  'intro.nameInput': {
    id: 'intro.nameInput',
    type: 'input',
    next: 'intro.cabanePresentation',
  },
  'intro.cabanePresentation': {
    id: 'intro.cabanePresentation',
    type: 'dialogue',
    dialogueId: 'dialogue2',
    next: 'intro.goToReception',
  },
  'intro.goToReception': {
    id: 'intro.goToReception',
    type: 'objective',
    objective: "Clique sur l'accueil",
    next: null,
  },
  'arbre.atLadder': {
    id: 'arbre.atLadder',
    type: 'objective',
    objective: "Clique sur l'échelle",
    next: 'arbre.toPlatform',
  },
  'arbre.toPlatform': {
    id: 'arbre.toPlatform',
    type: 'cinematic',
    next: 'arbre.platformDialogue',
  },
  'arbre.platformDialogue': {
    id: 'arbre.platformDialogue',
    type: 'dialogue',
    dialogueId: 'arbrePlateforme',
    next: 'arbre.exploreLeaves',
  },
  'arbre.exploreLeaves': {
    id: 'arbre.exploreLeaves',
    type: 'objective',
    objective: 'Clique sur un fruit',
    next: 'arbre.leavesDialogue',
  },
  'arbre.leavesDialogue': {
    id: 'arbre.leavesDialogue',
    type: 'dialogue',
    dialogueId: 'arbreFeuilles',
    next: 'arbre.finalDialogue',
  },
  'arbre.finalDialogue': {
    id: 'arbre.finalDialogue',
    type: 'dialogue',
    dialogueId: 'arbreFinal',
    next: null,
  },
}

export const STORY_START_STEP = 'intro.treeWelcome'
