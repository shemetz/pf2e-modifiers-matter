import {
  calcDegreePlusRoll, calcSignificantModifiers, checkHighlightPotentials,
  modifierNegative,
  modifierPositive,
  shouldIgnoreStrikeCritFailToFail,
  sumMods,
} from '../scripts/pf2emm-logic.mjs'
import { getSetting } from '../scripts/pf2emm-utils.mjs'
import { DEGREES } from '../scripts/pf2emm-types.mjs'

const VERBOSE = false
let mockSettingValue = true

// mock game functions
global.game = {
  i18n: {
    localize: (key) => key,
  },
  settings: {
    get: (moduleId, settingName) => {
      VERBOSE &&
      console.info(`(game.settings.get(${moduleId}, ${settingName}) called; mocking return as ${mockSettingValue})`)
      return mockSettingValue
    },
  },
}

const test = (testName, testValue, expectedValue) => {
  if (JSON.stringify(testValue) === JSON.stringify(expectedValue)) {
    VERBOSE && console.log(`PASS: ${testName}`)
  } else {
    console.error(`FAIL: ${testName}`)
    console.error(`  Expected: ${JSON.stringify(expectedValue, null, 2)}`)
    console.error(`  Got: ${JSON.stringify(testValue, null, 2)}`)
    console.error()
  }
}

test('sumMods', sumMods([
  { label: 'Heroism', modifier: 1, type: 'status', slug: 'heroism', enabled: true, ignored: false },
  { label: 'Aid', modifier: 2, type: 'circumstance', slug: 'aid', enabled: true, ignored: false },
]), 3)

test('modifierPositive',
  modifierPositive({ label: 'Heroism', modifier: 1, type: 'status', slug: 'heroism', enabled: true, ignored: false }),
  true)
test('modifierPositive',
  modifierPositive(
    { label: 'Off-Guard', modifier: -2, type: 'circumstance', slug: 'off-guard', enabled: true, ignored: false }),
  false)

test('modifierNegative',
  modifierNegative({ label: 'Heroism', modifier: 1, type: 'status', slug: 'heroism', enabled: true, ignored: false }),
  false)
test('modifierNegative',
  modifierNegative(
    { label: 'Off-Guard', modifier: -2, type: 'cirucmstance', slug: 'off-guard', enabled: true, ignored: false }),
  true)

test('calcDegreePlusRoll', calcDegreePlusRoll(0, 7), DEGREES.SUCCESS)
test('calcDegreePlusRoll', calcDegreePlusRoll(0, 2), DEGREES.SUCCESS)
test('calcDegreePlusRoll', calcDegreePlusRoll(0, 19), DEGREES.SUCCESS)
test('calcDegreePlusRoll', calcDegreePlusRoll(0, 1), DEGREES.FAILURE)
test('calcDegreePlusRoll', calcDegreePlusRoll(0, 20), DEGREES.CRIT_SUCC)
test('calcDegreePlusRoll', calcDegreePlusRoll(9, 7), DEGREES.SUCCESS)
test('calcDegreePlusRoll', calcDegreePlusRoll(10, 7), DEGREES.CRIT_SUCC)
test('calcDegreePlusRoll', calcDegreePlusRoll(11, 7), DEGREES.CRIT_SUCC)
test('calcDegreePlusRoll', calcDegreePlusRoll(11, 20), DEGREES.CRIT_SUCC)
test('calcDegreePlusRoll', calcDegreePlusRoll(99, 20), DEGREES.CRIT_SUCC)
test('calcDegreePlusRoll', calcDegreePlusRoll(-1, 7), DEGREES.FAILURE)
test('calcDegreePlusRoll', calcDegreePlusRoll(-1, 2), DEGREES.FAILURE)
test('calcDegreePlusRoll', calcDegreePlusRoll(-1, 19), DEGREES.FAILURE)
test('calcDegreePlusRoll', calcDegreePlusRoll(-1, 1), DEGREES.CRIT_FAIL)
test('calcDegreePlusRoll', calcDegreePlusRoll(-1, 20), DEGREES.SUCCESS)
test('calcDegreePlusRoll', calcDegreePlusRoll(-10, 7), DEGREES.CRIT_FAIL)

test('getSetting mock', getSetting('testSetting'), true)
test('shouldIgnoreStrikeCritFailToFail', shouldIgnoreStrikeCritFailToFail(DEGREES.CRIT_FAIL, DEGREES.FAILURE, true),
  true)
test('shouldIgnoreStrikeCritFailToFail', shouldIgnoreStrikeCritFailToFail(DEGREES.FAILURE, DEGREES.CRIT_FAIL, true),
  true)
test('shouldIgnoreStrikeCritFailToFail', shouldIgnoreStrikeCritFailToFail(DEGREES.CRIT_FAIL, DEGREES.FAILURE, false),
  false)
test('shouldIgnoreStrikeCritFailToFail', shouldIgnoreStrikeCritFailToFail(DEGREES.CRIT_FAIL, DEGREES.SUCCESS, true),
  false)
test('shouldIgnoreStrikeCritFailToFail', shouldIgnoreStrikeCritFailToFail(DEGREES.CRIT_FAIL, DEGREES.CRIT_SUCC, true),
  false)
test('shouldIgnoreStrikeCritFailToFail', shouldIgnoreStrikeCritFailToFail(DEGREES.SUCCESS, DEGREES.CRIT_SUCC, true),
  false)
test('shouldIgnoreStrikeCritFailToFail', shouldIgnoreStrikeCritFailToFail(DEGREES.SUCCESS, DEGREES.CRIT_FAIL, true),
  false)

test('checkHighlightPotentials 1', checkHighlightPotentials({
      rollMods: [
        { label: 'Heroism', modifier: 1, type: 'status', slug: 'heroism', enabled: true, ignored: false },
        { label: 'Aid', modifier: 2, type: 'circumstance', slug: 'aid', enabled: true, ignored: false },
      ],
      dcMods: [],
      currentDegreeOfSuccess: DEGREES.FAILURE,
      originalDeltaFromDc: -1,
      dieRoll: 7,
      isStrike: true,
    },
  ), {
    plus1StatusHasPotential: false,
    plus2StatusHasPotential: true,
    plus2CircumstanceAcHasPotential: false,
  },
)
test('checkHighlightPotentials 2', checkHighlightPotentials({
      rollMods: [
        { label: 'Heroism', modifier: 1, type: 'status', slug: 'heroism', enabled: true, ignored: false },
        { label: 'Aid', modifier: 2, type: 'circumstance', slug: 'aid', enabled: true, ignored: false },
      ],
      dcMods: [],
      originalDeltaFromDc: 1,
      dieRoll: 7,
      currentDegreeOfSuccess: DEGREES.SUCCESS,
      isStrike: true,
    },
  ), {
    plus1StatusHasPotential: false,
    plus2StatusHasPotential: false,
    plus2CircumstanceAcHasPotential: true,
  },
)
test('checkHighlightPotentials 3, higher existing bonus', checkHighlightPotentials({
      rollMods: [
        { label: 'Heroism', modifier: 4, type: 'status', slug: 'heroism', enabled: true, ignored: false },
        { label: 'Aid', modifier: 5, type: 'circumstance', slug: 'aid', enabled: true, ignored: false },
      ],
      dcMods: [],
      originalDeltaFromDc: 1,
      dieRoll: 7,
      currentDegreeOfSuccess: DEGREES.SUCCESS,
      isStrike: true,
    },
  ), {
    plus1StatusHasPotential: false,
    plus2StatusHasPotential: false,
    plus2CircumstanceAcHasPotential: true,
  },
)

test('calcSignificantModifiers 1', calcSignificantModifiers({
    rollMods: [
      { label: 'Heroism', modifier: 1, type: 'status', slug: 'heroism', enabled: true, ignored: false, source: 'MOCK' },
      { label: 'Aid', modifier: 2, type: 'circumstance', slug: 'aid', enabled: true, ignored: false, source: 'MOCK' },
    ],
    dcMods: [],
    originalDeltaFromDc: 1,
    dieRoll: 7,
    currentDegreeOfSuccess: DEGREES.SUCCESS,
    isStrike: true,
  }), {
    significantRollModifiers: [
      { appliedTo: 'roll', name: 'Aid', sourceUuid: 'MOCK', value: 2, significance: 'ESSENTIAL' },
    ],
    significantDcModifiers: [],
    insignificantDcModifiers: [],
    highlightPotentials: {
      plus1StatusHasPotential: false,
      plus2StatusHasPotential: false,
      plus2CircumstanceAcHasPotential: true,
    },
  },
)
test('calcSignificantModifiers 2, higher existing bonus', calcSignificantModifiers({
    rollMods: [
      { label: 'Heroism', modifier: 4, type: 'status', slug: 'heroism', enabled: true, ignored: false, source: 'MOCK' },
      { label: 'Aid', modifier: 5, type: 'circumstance', slug: 'aid', enabled: true, ignored: false, source: 'MOCK' },
    ],
    dcMods: [],
    originalDeltaFromDc: 1,
    dieRoll: 7,
    currentDegreeOfSuccess: DEGREES.SUCCESS,
    isStrike: true,
  }), {
    significantRollModifiers: [
      { appliedTo: 'roll', name: 'Heroism', sourceUuid: 'MOCK', value: 4, significance: 'ESSENTIAL' },
      { appliedTo: 'roll', name: 'Aid', sourceUuid: 'MOCK', value: 5, significance: 'ESSENTIAL' },
    ],
    significantDcModifiers: [],
    insignificantDcModifiers: [],
    highlightPotentials: {
      plus1StatusHasPotential: false,
      plus2StatusHasPotential: false,
      plus2CircumstanceAcHasPotential: true,
    },
  },
)
test('calcSignificantModifiers 3, ezren hit skeleton in readme example 1', calcSignificantModifiers({
    rollMods: [
      { label: 'Bless', modifier: 1, type: 'status', slug: 'bless', enabled: true, ignored: false },
      { label: 'Assisting Shot', modifier: 1, type: 'circumstance', slug: 'ass-shot', enabled: true, ignored: false },
      { label: 'Enfeebled', modifier: -1, type: 'status', slug: 'enfeebled', enabled: true, ignored: false },
    ],
    dcMods: [
      { label: 'Frightened', modifier: -1, type: 'status', slug: 'frightened', enabled: true, ignored: false },
      { label: 'Off-Guard', modifier: -2, type: 'circumstance', slug: 'off-guard', enabled: true, ignored: false },
    ],
    originalDeltaFromDc: 11,
    dieRoll: 15,
    currentDegreeOfSuccess: DEGREES.CRIT_SUCC,
    isStrike: true,
  }), {
    'significantRollModifiers': [
      {
        'appliedTo': 'roll',
        'name': 'Bless',
        'value': 1,
        'significance': 'HELPFUL',
      },
      {
        'appliedTo': 'roll',
        'name': 'Assisting Shot',
        'value': 1,
        'significance': 'HELPFUL',
      },
    ],
    'significantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Frightened',
        'value': -1,
        'significance': 'HELPFUL',
      },
      {
        'appliedTo': 'dc',
        'name': 'Off-Guard',
        'value': -2,
        'significance': 'ESSENTIAL',
      },
    ],
    'insignificantDcModifiers': [],
    'highlightPotentials': {
      'plus1StatusHasPotential': false,
      'plus2StatusHasPotential': false,
      'plus2CircumstanceAcHasPotential': true,
    },
  },
)
test('calcSignificantModifiers 4, ezren hit skeleton in readme example 2', calcSignificantModifiers({
    rollMods: [
      { label: 'Bless', modifier: 1, type: 'status', slug: 'bless', enabled: true, ignored: false },
      { label: 'Assisting Shot', modifier: 1, type: 'circumstance', slug: 'ass-shot', enabled: true, ignored: false },
      { label: 'Enfeebled', modifier: -1, type: 'status', slug: 'enfeebled', enabled: true, ignored: false },
    ],
    dcMods: [
      { label: 'Frightened', modifier: -1, type: 'status', slug: 'frightened', enabled: true, ignored: false },
      { label: 'Off-Guard', modifier: -2, type: 'circumstance', slug: 'off-guard', enabled: true, ignored: false },
    ],
    originalDeltaFromDc: 10,
    dieRoll: 19,
    currentDegreeOfSuccess: DEGREES.CRIT_SUCC,
    isStrike: true,
  }), {
    'significantRollModifiers': [
      {
        'appliedTo': 'roll',
        'name': 'Bless',
        'value': 1,
        'significance': 'ESSENTIAL',
      },
      {
        'appliedTo': 'roll',
        'name': 'Assisting Shot',
        'value': 1,
        'significance': 'ESSENTIAL',
      },
    ],
    'significantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Frightened',
        'value': -1,
        'significance': 'ESSENTIAL',
      },
      {
        'appliedTo': 'dc',
        'name': 'Off-Guard',
        'value': -2,
        'significance': 'ESSENTIAL',
      },
    ],
    'insignificantDcModifiers': [],
    'highlightPotentials': {
      'plus1StatusHasPotential': false,
      'plus2StatusHasPotential': false,
      'plus2CircumstanceAcHasPotential': true,
    },
  },
)
test('calcSignificantModifiers 5, ezren hit skeleton in readme example 3', calcSignificantModifiers({
    rollMods: [
      { label: 'Bless', modifier: 1, type: 'status', slug: 'bless', enabled: true, ignored: false },
      { label: 'Assisting Shot', modifier: 1, type: 'circumstance', slug: 'ass-shot', enabled: true, ignored: false },
      { label: 'Enfeebled', modifier: -1, type: 'status', slug: 'enfeebled', enabled: true, ignored: false },
    ],
    dcMods: [
      { label: 'Frightened', modifier: -1, type: 'status', slug: 'frightened', enabled: true, ignored: false },
      { label: 'Off-Guard', modifier: -2, type: 'circumstance', slug: 'off-guard', enabled: true, ignored: false },
    ],
    originalDeltaFromDc: -1,
    dieRoll: 8,
    currentDegreeOfSuccess: DEGREES.FAILURE,
    isStrike: true,
  }), {
    'significantRollModifiers': [
      {
        'appliedTo': 'roll',
        'name': 'Enfeebled',
        'value': -1,
        'significance': 'HARMFUL',
      },
    ],
    'significantDcModifiers': [],
    'insignificantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Frightened',
        'value': -1,
        'significance': 'NONE',
      },
      {
        'appliedTo': 'dc',
        'name': 'Off-Guard',
        'value': -2,
        'significance': 'NONE',
      },
    ],
    'highlightPotentials': {
      'plus1StatusHasPotential': false,
      'plus2StatusHasPotential': true,
      'plus2CircumstanceAcHasPotential': false,
    },
  },
)

mockSettingValue = false
test('calcSignificantModifiers 6, ezren hit skeleton in readme example 4', calcSignificantModifiers({
    rollMods: [
      { label: 'Bless', modifier: 1, type: 'status', slug: 'bless', enabled: true, ignored: false },
      { label: 'Assisting Shot', modifier: 1, type: 'circumstance', slug: 'ass-shot', enabled: true, ignored: false },
      { label: 'Enfeebled', modifier: -1, type: 'status', slug: 'enfeebled', enabled: true, ignored: false },
    ],
    dcMods: [
      { label: 'Frightened', modifier: -1, type: 'status', slug: 'frightened', enabled: true, ignored: false },
      { label: 'Off-Guard', modifier: -2, type: 'circumstance', slug: 'off-guard', enabled: true, ignored: false },
      { label: 'Cover (Greater)', modifier: 4, type: 'circumstance', slug: 'cover', enabled: true, ignored: false },
    ],
    originalDeltaFromDc: -5,
    dieRoll: 8,
    currentDegreeOfSuccess: DEGREES.FAILURE,
    isStrike: true,
  }), {
    'significantRollModifiers': [
      {
        'appliedTo': 'roll',
        'name': 'Bless',
        'value': 1,
        'significance': 'HELPFUL',
      },
      {
        'appliedTo': 'roll',
        'name': 'Assisting Shot',
        'value': 1,
        'significance': 'HELPFUL',
      },
      {
        'appliedTo': 'roll',
        'name': 'Enfeebled',
        'value': -1,
        'significance': 'DETRIMENTAL',
      },
    ],
    'significantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Frightened',
        'value': -1,
        'significance': 'HELPFUL',
      },
      {
        'appliedTo': 'dc',
        'name': 'Off-Guard',
        'value': -2,
        'significance': 'HELPFUL',
      },
      {
        'appliedTo': 'dc',
        'name': 'Cover (Greater)',
        'value': 4,
        'significance': 'DETRIMENTAL',
      },
    ],
    'insignificantDcModifiers': [],
    'highlightPotentials': {
      'plus1StatusHasPotential': false,
      'plus2StatusHasPotential': false,
      'plus2CircumstanceAcHasPotential': false,
    },
  },
)
test('calcSignificantModifiers 6, ezren hit skeleton in readme example 5', calcSignificantModifiers({
    rollMods: [
      { label: 'Bless', modifier: 1, type: 'status', slug: 'bless', enabled: true, ignored: false },
      { label: 'Assisting Shot', modifier: 1, type: 'circumstance', slug: 'ass-shot', enabled: true, ignored: false },
      { label: 'Enfeebled', modifier: -1, type: 'status', slug: 'enfeebled', enabled: true, ignored: false },
    ],
    dcMods: [
      { label: 'Frightened', modifier: -1, type: 'status', slug: 'frightened', enabled: true, ignored: false },
      { label: 'Off-Guard', modifier: -2, type: 'circumstance', slug: 'off-guard', enabled: true, ignored: false },
      { label: 'Cover (Greater)', modifier: 4, type: 'circumstance', slug: 'cover', enabled: true, ignored: false },
    ],
    originalDeltaFromDc: -2,
    dieRoll: 11,
    currentDegreeOfSuccess: DEGREES.FAILURE,
    isStrike: true,
  }), {
    'significantRollModifiers': [],
    'significantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Cover (Greater)',
        'value': 4,
        'significance': 'HARMFUL',
      },
    ],
    'insignificantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Frightened',
        'value': -1,
        'significance': 'NONE',
      },
      {
        'appliedTo': 'dc',
        'name': 'Off-Guard',
        'value': -2,
        'significance': 'NONE',
      },
    ],
    'highlightPotentials': {
      'plus1StatusHasPotential': false,
      'plus2StatusHasPotential': false,
      'plus2CircumstanceAcHasPotential': false,
    },
  },
)
test('calcSignificantModifiers 7, valeros reflex save in readme example', calcSignificantModifiers({
    rollMods: [],
    dcMods: [
      { label: 'Stupefied', modifier: -2, type: 'status', slug: 'stupefied', enabled: true, ignored: false },
    ],
    originalDeltaFromDc: +1,
    dieRoll: 9,
    currentDegreeOfSuccess: DEGREES.SUCCESS,
    isStrike: false,
  }), {
    'significantRollModifiers': [],
    'significantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Stupefied',
        'value': -2,
        'significance': 'ESSENTIAL',
      },
    ],
    'insignificantDcModifiers': [],
    'highlightPotentials': {
      'plus1StatusHasPotential': false,
      'plus2StatusHasPotential': false,
      'plus2CircumstanceAcHasPotential': false,
    },
  },
)
test('calcSignificantModifiers 8, gilgwyn tumble through in readme example', calcSignificantModifiers({
    rollMods: [
      { label: 'Clumsy 1', modifier: -1, type: 'status', slug: 'clumsy', enabled: true, ignored: false },
    ],
    dcMods: [
      {
        label: 'Drakeheart Mutagen',
        modifier: -1,
        type: 'status',
        slug: 'drakeheart-mutagen',
        enabled: true,
        ignored: false,
      },
    ],
    originalDeltaFromDc: 0,
    dieRoll: 3,
    currentDegreeOfSuccess: DEGREES.SUCCESS,
    isStrike: false,
  }), {
    'significantRollModifiers': [],
    'significantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Drakeheart Mutagen',
        'value': -1,
        'significance': 'ESSENTIAL',
      },
    ],
    'insignificantDcModifiers': [],
    'highlightPotentials': {
      'plus1StatusHasPotential': false,
      'plus2StatusHasPotential': false,
      'plus2CircumstanceAcHasPotential': false,
    },
  },
)

/*
  EXAMPLE:
  - A player character (buffed with Heroism, helped with Aid) is attacking an enemy (who is unconscious and frightened)
  - Roll modifiers: +1 from Aid, +2 from Heroism
  - DC modifiers: -2 from Frightened, -4 from Unconscious, +1 from Lesser Cover
    - Other modifiers (e.g. from level, ability, non-stacking bonuses) are ignored earlier in the process
  - Die roll: 10, roll total: 19, DC: 16
    - originalDeltaFromDc = +3, currentDegreeOfSuccess = SUCCESS
 */
test('calcSignificantModifiers 9, player attacking unconscious and frightened enemy', calcSignificantModifiers({
    rollMods: [
      { label: 'Heroism', modifier: 2, type: 'status', slug: 'heroism', enabled: true, ignored: false },
      { label: 'Aid', modifier: 1, type: 'circumstance', slug: 'aid', enabled: true, ignored: false },
    ],
    dcMods: [
      { label: 'Frightened', modifier: -2, type: 'status', slug: 'frightened', enabled: true, ignored: false },
      { label: 'Unconscious', modifier: -4, type: 'status', slug: 'unconscious', enabled: true, ignored: false },
      { label: 'Lesser Cover', modifier: 1, type: 'circumstance', slug: 'cover', enabled: true, ignored: false },
    ],
    originalDeltaFromDc: 3,
    dieRoll: 10,
    currentDegreeOfSuccess: DEGREES.SUCCESS,
    isStrike: true,
  }), {
    'significantRollModifiers': [
      {
        'appliedTo': 'roll',
        'name': 'Heroism',
        'value': 2,
        'significance': 'HELPFUL',
      },
      {
        'appliedTo': 'roll',
        'name': 'Aid',
        'value': 1,
        'significance': 'HELPFUL',
      },
    ],
    'significantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Frightened',
        'value': -2,
        'significance': 'HELPFUL',
      },
      {
        'appliedTo': 'dc',
        'name': 'Unconscious',
        'value': -4,
        'significance': 'ESSENTIAL',
      },
    ],
    'insignificantDcModifiers': [
      {
        'appliedTo': 'dc',
        'name': 'Lesser Cover',
        'value': 1,
        'significance': 'NONE',
      },
    ],
    'highlightPotentials': {
      'plus1StatusHasPotential': false,
      'plus2StatusHasPotential': false,
      'plus2CircumstanceAcHasPotential': false,
    },
  },
)