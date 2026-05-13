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
    next: 'arbre.ladderDown',
  },
  'arbre.ladderDown': {
    id: 'arbre.ladderDown',
    type: 'cinematic',
    next: 'arbre.toLadderTop',
  },
  'arbre.toLadderTop': {
    id: 'arbre.toLadderTop',
    type: 'cinematic',
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
    next: 'arbre.outroDialogue',
  },
  'arbre.outroDialogue': {
    id: 'arbre.outroDialogue',
    type: 'dialogue',
    dialogueId: 'arbreOutro',
    next: null,
  },
  'arbre.backAtBase': {
    id: 'arbre.backAtBase',
    type: 'cinematic',
    next: 'arbre.toStairs02Down',
  },
  'arbre.toStairs02Down': {
    id: 'arbre.toStairs02Down',
    type: 'cinematic',
    next: 'arbre.toStairs02Top',
  },
  'arbre.toStairs02Top': {
    id: 'arbre.toStairs02Top',
    type: 'cinematic',
    next: 'arbre.nidDialogue',
  },
  'arbre.nidDialogue': {
    id: 'arbre.nidDialogue',
    type: 'dialogue',
    dialogueId: 'nidArrivee',
    next: 'arbre.toNest',
  },
  'arbre.toNest': {
    id: 'arbre.toNest',
    type: 'cinematic',
    next: 'arbre.nestDialogue1',
  },
  'arbre.nestDialogue1': {
    id: 'arbre.nestDialogue1',
    type: 'dialogue',
    dialogueId: 'marieNid1',
    next: 'arbre.nestInteraction',
  },
  'arbre.nestInteraction': {
    id: 'arbre.nestInteraction',
    type: 'objective',
    objective: 'Trier les feuilles par couleurs',
    next: 'arbre.nestDialogue2',
  },
  'arbre.nestDialogue2': {
    id: 'arbre.nestDialogue2',
    type: 'dialogue',
    dialogueId: 'marieNid2',
    next: 'arbre.treeDialogue25',
  },
  'arbre.treeDialogue25': {
    id: 'arbre.treeDialogue25',
    type: 'dialogue',
    dialogueId: 'treeDialogue25',
    next: 'arbre.outroStairs02Top',
  },
  'arbre.outroStairs02Top': {
    id: 'arbre.outroStairs02Top',
    type: 'cinematic',
    next: 'arbre.outroStairs02Down',
  },
  'arbre.outroStairs02Down': {
    id: 'arbre.outroStairs02Down',
    type: 'cinematic',
    next: 'arbre.outroWP4',
  },
  'arbre.outroWP4': {
    id: 'arbre.outroWP4',
    type: 'cinematic',
    next: 'arbre.outroWP3',
  },
  'arbre.outroWP3': {
    id: 'arbre.outroWP3',
    type: 'cinematic',
    next: 'arbre.outroWP1',
  },
  'arbre.outroWP1': {
    id: 'arbre.outroWP1',
    type: 'cinematic',
    next: 'arbre.outroWP0',
  },
  'arbre.outroWP0': {
    id: 'arbre.outroWP0',
    type: 'cinematic',
    next: null,
  },
}

export const STORY_START_STEP = 'intro.treeWelcome'
