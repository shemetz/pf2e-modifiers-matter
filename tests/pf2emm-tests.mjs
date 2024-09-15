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
    console.error(`  Expected: ${JSON.stringify(expectedValue)}`)
    console.error(`  Got: ${JSON.stringify(testValue)}`)
    console.log()
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

test('calcSignificantModifiers 1', calcSignificantModifiers({
    rollMods: [
      { label: 'Heroism', modifier: 1, type: 'status', slug: 'heroism', enabled: true, ignored: false },
      { label: 'Aid', modifier: 2, type: 'circumstance', slug: 'aid', enabled: true, ignored: false },
    ],
    dcMods: [],
    originalDeltaFromDc: 1,
    dieRoll: 7,
    currentDegreeOfSuccess: DEGREES.SUCCESS,
    isStrike: true,
  }), {
    significantRollModifiers: [{ appliedTo: 'roll', name: 'Aid', value: 2, significance: 'ESSENTIAL' }],
    significantDcModifiers: [],
    insignificantDcModifiers: [],
    highlightPotentials: {
      plus1StatusHasPotential: false,
      plus2StatusHasPotential: false,
      plus2CircumstanceAcHasPotential: true,
    },
  },
)