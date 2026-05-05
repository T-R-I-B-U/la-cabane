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
}

export const STORY_START_STEP = 'intro.treeWelcome'
