import { DEGREES, MODULE_ID, SIGNIFICANCE } from './pf2emm-types.mjs'
import { getSetting } from './pf2emm-utils.mjs'

/**
 * @param {Modifier[]} modsList
 * @returns {number}
 */
export const sumMods = (modsList) => modsList.reduce((accumulator, curr) => accumulator + curr.modifier, 0)

/** @param {Modifier} m
 *  @return {boolean} */
export const modifierPositive = m => m.modifier > 0

/** @param {Modifier} m
 *  @return {boolean} */
export const modifierNegative = m => m.modifier < 0

// REMEMBER:  in Pf2e, delta 0-9 means SUCCESS, delta 10+ means CRIT SUCCESS, delta -1-9 is FAIL, delta -10- is CRIT FAIL
const pf2emmLogic = (deltaFromDc) => {
  switch (true) {
    case deltaFromDc >= 10:
      return DEGREES.CRIT_SUCC
    case deltaFromDc <= -10:
      return DEGREES.CRIT_FAIL
    case deltaFromDc >= 1:
      return DEGREES.SUCCESS
    case deltaFromDc <= -1:
      return DEGREES.FAILURE
    case deltaFromDc === 0:
      return DEGREES.SUCCESS
  }
  // impossible
  console.error(`${MODULE_ID} | calcDegreeOfSuccess got wrong number: ${deltaFromDc}`)
  return DEGREES.CRIT_FAIL
}

export const calcDegreePlusRoll = (deltaFromDc, dieRoll) => {
  const degree = pf2emmLogic(deltaFromDc)
  // handle natural 20 and natural 1
  if (dieRoll === 20) {
    switch (degree) {
      case 'CRIT_SUCC':
        return DEGREES.CRIT_SUCC
      case 'SUCCESS':
        return DEGREES.CRIT_SUCC
      case 'FAILURE':
        return DEGREES.SUCCESS
      case 'CRIT_FAIL':
        return DEGREES.FAILURE
    }
  } else if (dieRoll === 1) {
    switch (degree) {
      case 'CRIT_SUCC':
        return DEGREES.SUCCESS
      case 'SUCCESS':
        return DEGREES.FAILURE
      case 'FAILURE':
        return DEGREES.CRIT_FAIL
      case 'CRIT_FAIL':
        return DEGREES.CRIT_FAIL
    }
  } else return degree
}

/**
 * @param {Degree} oldDOS
 * @param {Degree} newDOS
 * @param {boolean} isStrike
 * @returns {boolean}
 */
export const shouldIgnoreStrikeCritFailToFail = (oldDOS, newDOS, isStrike) => {
  // only ignore in this somewhat common edge case:
  return (
    // fail changed to crit fail, or vice versa
    ((oldDOS === DEGREES.FAILURE && newDOS === DEGREES.CRIT_FAIL)
      || (oldDOS === DEGREES.CRIT_FAIL && newDOS === DEGREES.FAILURE))
    // and this game setting is enabled
    && getSetting('ignore-crit-fail-over-fail-on-attacks')
    // and it was a Strike attack
    && isStrike
  )
}

/**
 * See:
 * - https://2e.aonprd.com/ConsciousMinds.aspx?ID=2 (Amped Guidance, +1 or +2 status bonus to any check)
 * - https://2e.aonprd.com/Spells.aspx?ID=1890 (Nudge Fate, +1 status bonus to any check)
 * - https://2e.aonprd.com/Feats.aspx?ID=4802 (Guardian's Deflection, +2 circumstance bonus to AC)
 *
 * These are abilities that require a player to know that a roll failed/succeeded by a certain amount.
 *
 * This function will calculate whether any of the above abilities would be helpful, and based on that the code will
 * later insert markers into the chat message, for any of them that would indeed help.  Those markers will become
 * visible to any player who has the highlight-potentials-preset game setting enabled for the matching modifier.
 *
 * This function checks:
 * - degree of success can be upgraded/downgraded to the appropriate one
 * - status/circumstance bonus would be significant (taking existing bonuses into account)
 * - not a crit-fail strike upgraded to fail (depends on setting)
 *
 * This function does not check:
 * - type of roll (already assumed to be an attack, skill, perception, or saving throw)
 * - actor
 * - whether any reaction is available
 * - whether any user has the relevant ability
 */
export const checkHighlightPotentials = ({
  rollMods,
  dcMods,
  originalDeltaFromDc,
  dieRoll,
  currentDegreeOfSuccess,
  isStrike,
}) => {
  const highestStatusBonus = Math.max(
    ...rollMods.filter(m => m.type === 'status').map(m => m.modifier),
    0,
  )
  const highestDcCircumstanceBonus = Math.max(
    ...dcMods.filter(m => m.type === 'circumstance').map(m => m.modifier),
    0,
  )
  const plus1StatusDegree = calcDegreePlusRoll(originalDeltaFromDc + 1 - highestStatusBonus, dieRoll)
  const plus1StatusHasPotential = plus1StatusDegree !== currentDegreeOfSuccess
    && plus1StatusDegree !== DEGREES.CRIT_SUCC
    && !shouldIgnoreStrikeCritFailToFail(currentDegreeOfSuccess, plus1StatusDegree, isStrike)
  const plus2StatusDegree = calcDegreePlusRoll(originalDeltaFromDc + 2 - highestStatusBonus, dieRoll)
  const plus2StatusHasPotential = plus2StatusDegree !== currentDegreeOfSuccess
    && plus2StatusDegree !== DEGREES.CRIT_SUCC
    && !shouldIgnoreStrikeCritFailToFail(currentDegreeOfSuccess, plus2StatusDegree, isStrike)
  const plus2CircumstanceAcDegree = calcDegreePlusRoll(originalDeltaFromDc - 2 + highestDcCircumstanceBonus, dieRoll)
  const plus2CircumstanceAcHasPotential = plus2CircumstanceAcDegree !== currentDegreeOfSuccess
    && plus2CircumstanceAcDegree !== DEGREES.CRIT_FAIL
    && isStrike
  return {
    plus1StatusHasPotential,
    plus2StatusHasPotential,
    plus2CircumstanceAcHasPotential,
  }
}

/**
 * This function calculates which modifiers were significant in the outcome of a roll.
 * It divides the modifiers (of the roll and of the target DC) into three categories:
 * 1.  significantRollModifiers - these are the modifiers applied to the roll itself that definitely or probably changed
 *     the outcome of the roll.  For example, a +1 bonus from Aid, applied to an attack.
 *     Each of those modifiers will have a "significance" field that is one of the values in the SIGNIFICANCE enum,
 *     other than "NONE".  Each of these modifiers will be highlighted in the chat message.
 * 2.  significantDcModifiers - same as the above, but modifiers applied to the DC (the target number).  For example,
 *     a -2 penalty from Frightened.
 * 3.  insignificantDcModifiers - unlike the above, these are modifiers that definitely had no effect on the outcome.
 *     They are only included here because the setting "always-show-defense-conditions" may cause them to be displayed.
 *
 * @param {Modifier[]} rollMods
 * @param {Modifier[]} dcMods
 * @param {number} originalDeltaFromDc delta 0-9 means SUCCESS, delta 10+ means CRIT SUCCESS, etc
 * @param {number} dieRoll
 * @param {Degree} currentDegreeOfSuccess
 * @param {boolean} isStrike
 * @returns {{
 *   significantRollModifiers: SignificantModifier[],
 *   significantDcModifiers: SignificantModifier[],
 *   insignificantDcModifiers: InsignificantModifier[]
 * }}
 */
export const calcSignificantModifiers = ({
  rollMods,
  dcMods,
  originalDeltaFromDc,
  dieRoll,
  currentDegreeOfSuccess,
  isStrike,
}) => {
  /**
   * wouldChangeOutcome(x) returns true if a bonus of x ("penalty" if x is negative) changes the degree of success
   * (in either direction).
   * @param {number} extra
   */
  const wouldChangeOutcome = (extra) => {
    const newDegreeOfSuccess = calcDegreePlusRoll(originalDeltaFromDc + extra, dieRoll)
    return newDegreeOfSuccess !== currentDegreeOfSuccess &&
      !shouldIgnoreStrikeCritFailToFail(currentDegreeOfSuccess, newDegreeOfSuccess, isStrike)
  }

  // "positive" = +1, +2, etc
  // "negative" = -1, -2, etc
  const positiveRollMods = rollMods.filter(modifierPositive)
  const negativeRollMods = rollMods.filter(modifierNegative)
  const positiveDcMods = dcMods.filter(modifierPositive)
  const negativeDcMods = dcMods.filter(modifierNegative)
  const necessaryPositiveRollMods = positiveRollMods.filter(m => wouldChangeOutcome(-m.modifier))
  const necessaryNegativeRollMods = negativeRollMods.filter(m => wouldChangeOutcome(-m.modifier))
  const necessaryPositiveDcMods = positiveDcMods.filter(m => wouldChangeOutcome(m.modifier))
  const necessaryNegativeDcMods = negativeDcMods.filter(m => wouldChangeOutcome(m.modifier))
  // "beneficial" = positive roll mod or negative dc mod
  // "detrimental" = negative roll mod or positive dc mod
  const totalBeneficialDelta = sumMods(positiveRollMods) - sumMods(negativeDcMods)
  const totalDetrimentalDelta = sumMods(negativeRollMods) - sumMods(positiveDcMods) // negative!
  // sum of modifiers that were necessary to reach the current outcome - these are the biggest bonuses/penalties.
  const necessaryBeneficialDelta = sumMods(necessaryPositiveRollMods) - sumMods(necessaryPositiveDcMods)
  const necessaryDetrimentalDelta = sumMods(necessaryNegativeRollMods) - sumMods(necessaryNegativeDcMods)
  // sum of all other modifiers.  if this sum's changing does not affect the outcome it means modifiers were unnecessary
  const remainingBeneficialDelta = totalBeneficialDelta - necessaryBeneficialDelta
  const remainingDetrimentalDelta = totalDetrimentalDelta - necessaryDetrimentalDelta // negative!
  // based on the above sums and the following booleans, we can determine which modifiers were significant and how much
  const didTotBenChangeOutcome = wouldChangeOutcome(-totalBeneficialDelta)
  const didTotDetChangeOutcome = wouldChangeOutcome(-totalDetrimentalDelta)
  const didRemBenChangeOutcome = wouldChangeOutcome(-remainingBeneficialDelta)
  const didRemDetChangeOutcome = wouldChangeOutcome(-remainingDetrimentalDelta)

  /*
  EXAMPLE:
  - A player character (buffed with Heroism, helped with Aid) is attacking an enemy (who is unconscious and frightened)
  - Roll modifiers: +1 from Aid, +2 from Heroism
  - DC modifiers: -2 from Frightened, -4 from Unconscious, +1 from Lesser Cover
    - Other modifiers (e.g. from level, ability, non-stacking bonuses) are ignored earlier in the process
  - Die roll: 10, roll total: 19, DC: 16
    - originalDeltaFromDc = +3, currentDegreeOfSuccess = SUCCESS

  This function calculates:
    - wouldChangeOutcome(x) returns true when x is -4 or lower, or +7 or higher
    - necessaryNegativeDcMods = -4 from Unconscious.  Nothing else is "necessary" so other such arrays are empty.
    - totalBeneficialDelta = +1+2 - (-2-4) = +3+6 = +9
    - totalDetrimentalDelta = -0 - 1 = -1
    - necessaryBeneficialDelta = 0 - (-4) = +4
    - necessaryDetrimentalDelta = 0 - 0 = 0
    - remainingBeneficialDelta = +9 - 4 = +5
    - remainingDetrimentalDelta = -1 - 0 = -1
    - didTotBenChangeOutcome = wouldChangeOutcome(-9) = true
    - didTotDetChangeOutcome = wouldChangeOutcome(1) = false
    - didRemBenChangeOutcome = wouldChangeOutcome(-5) = true
    - didRemDetChangeOutcome = wouldChangeOutcome(1) = false
  Which means:
    - Aid:  calcSignificance(+1):
      - changedOutcome = wouldChangeOutcome(-1) = false
      - isPositiveMod && !changedOutcome && didTotBenChangeOutcome && didRemBenChangeOutcome:
      = true && !false && true && true
      - returns SIGNIFICANCE.HELPFUL
    - Heroism:  calcSignificance(+2):  SIGNIFICANCE.HELPFUL
    - Frightened:  calcSignificance(-2):  SIGNIFICANCE.HARMFUL
    - Unconscious:  calcSignificance(-4):  SIGNIFICANCE.ESSENTIAL
    - Lesser Cover:  calcSignificance(+1):  SIGNIFICANCE.NONE
  */

  const calcSignificance = (modifierValue) => {
    const isNegativeMod = modifierValue < 0
    const isPositiveMod = modifierValue > 0
    const changedOutcome = wouldChangeOutcome(-modifierValue)
    if (isPositiveMod && changedOutcome)
      return SIGNIFICANCE.ESSENTIAL
    if (isPositiveMod && !changedOutcome && didTotBenChangeOutcome && didRemBenChangeOutcome)
      return SIGNIFICANCE.HELPFUL
    if (isNegativeMod && changedOutcome)
      return SIGNIFICANCE.HARMFUL
    if (isNegativeMod && !changedOutcome && didTotDetChangeOutcome && didRemDetChangeOutcome)
      return SIGNIFICANCE.DETRIMENTAL
    return SIGNIFICANCE.NONE
  }
  const significantRollModifiers = []
  const significantDcModifiers = []
  const insignificantDcModifiers = []
  rollMods.forEach(m => {
    const modVal = m.modifier
    const significance = calcSignificance(modVal)
    if (significance === SIGNIFICANCE.NONE) return
    significantRollModifiers.push({
      appliedTo: 'roll',
      name: m.label,
      value: modVal,
      significance: significance,
    })
  })
  dcMods.forEach(m => {
    const modVal = m.modifier
    const significance = calcSignificance(-modVal)
    const arr = significance === SIGNIFICANCE.NONE ? insignificantDcModifiers : significantDcModifiers
    arr.push({
      appliedTo: 'dc',
      name: m.label,
      value: modVal,
      significance: significance,
    })
  })
  const highlightPotentials = checkHighlightPotentials({
    rollMods,
    dcMods,
    originalDeltaFromDc,
    dieRoll,
    currentDegreeOfSuccess,
    isStrike,
  })

  return {
    significantRollModifiers,
    significantDcModifiers,
    insignificantDcModifiers,
    highlightPotentials,
  }
}