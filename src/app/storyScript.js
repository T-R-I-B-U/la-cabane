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
    next: 'arbre.outroPlatformTop',
  },
  'arbre.outroPlatformTop': {
    id: 'arbre.outroPlatformTop',
    type: 'cinematic',
    next: 'arbre.outroPlatformLadderTop',
  },
  'arbre.outroPlatformLadderTop': {
    id: 'arbre.outroPlatformLadderTop',
    type: 'cinematic',
    next: 'arbre.backAtBase',
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
    next: 'arbre.treeDialogue25',
  },
  'arbre.treeDialogue25': {
    id: 'arbre.treeDialogue25',
    type: 'dialogue',
    dialogueId: 'treeDialogue25',
    next: 'arbre.outroNest1',
  },
  'arbre.outroNest1': {
    id: 'arbre.outroNest1',
    type: 'cinematic',
    next: 'arbre.outroNest2',
  },
  'arbre.outroNest2': {
    id: 'arbre.outroNest2',
    type: 'cinematic',
    next: 'arbre.outroNest3',
  },
  'arbre.outroNest3': {
    id: 'arbre.outroNest3',
    type: 'cinematic',
    next: 'arbre.outroNest4',
  },
  'arbre.outroNest4': {
    id: 'arbre.outroNest4',
    type: 'cinematic',
    next: 'arbre.outroNest5',
  },
  'arbre.outroNest5': {
    id: 'arbre.outroNest5',
    type: 'cinematic',
    next: 'arbre.outroNest6',
  },
  'arbre.outroNest6': {
    id: 'arbre.outroNest6',
    type: 'cinematic',
    next: 'arbre.outroNest9',
  },
  'arbre.outroNest9': {
    id: 'arbre.outroNest9',
    type: 'cinematic',
    next: 'arbre.outroNest10',
  },
  'arbre.outroNest10': {
    id: 'arbre.outroNest10',
    type: 'cinematic',
    next: 'arbre.outroNest11',
  },
  'arbre.outroNest11': {
    id: 'arbre.outroNest11',
    type: 'cinematic',
    next: null,
  },
}

export const STORY_START_STEP = 'intro.treeWelcome'
