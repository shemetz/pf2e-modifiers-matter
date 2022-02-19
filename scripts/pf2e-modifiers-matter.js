const MODULE_ID = 'pf2e-modifiers-matter'
// TODO - figure out how to notice effects on the target that change their Ref/Fort/Will DC, e.g. when trying to Tumble Through against targeted enemy
// TODO - also effects from "rules" in general
// so far:  got Cover to work (flat modifier to ac)

// Helpful for testing - replace random dice roller with 1,2,3,4....19,20 by putting this in the console:
/*
NEXT_RND_ROLLS_D20 = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
rndIndex = -1
CONFIG.Dice.randomUniform = () => {rndIndex = (rndIndex + 1) % NEXT_RND_ROLLS_D20.length; return NEXT_RND_ROLLS_D20[rndIndex] / 20 - 0.001}
 */

// this file has a ton of math (mostly simple).
// I did my best to make it all easily understandable math, but there are limits to what I can do.

// strong green = this condition was necessary to achieve this result (others were potentially also necessary).  this
// means the one who caused this condition should definitely be congratulated/thanked.
// weak green = this condition was not necessary to achieve this result, but degree of success did change due to
// something in this direction, through a collection of weak green and/or strong green conditions.  for example,
// if you rolled a 14, had +1 & +2, and needed a 15, both the +1 and +2 are weak green because neither is necessary on
// its own but they were necessary together.
// if you had rolled a 13 in this case, the +2 would be strong green but the +1 would still be weak green, simply
// because it's difficult to come up with an algorithm that would solve complex cases.
// note, by the way, that in case of multiple non-stacking conditions, PF2e hides some of them from the chat card.
const POSITIVE_COLOR = '#008000'
const WEAK_POSITIVE_COLOR = '#91a82a'
const NEGATIVE_COLOR = '#ff0000'
const WEAK_NEGATIVE_COLOR = '#ff852f'
let IGNORED_MODIFIER_LABELS = []

const initializeIgnoredModifiers = () => {
  const IGNORED_MODIFIERS_I18N = [
    'PF2E.BaseModifier',
    'PF2E.MultipleAttackPenalty',
    'PF2E.ProficiencyLevel0',
    'PF2E.ProficiencyLevel1',
    'PF2E.ProficiencyLevel2',
    'PF2E.ProficiencyLevel3',
    'PF2E.ProficiencyLevel4',
    'PF2E.AbilityStr',
    'PF2E.AbilityCon',
    'PF2E.AbilityDex',
    'PF2E.AbilityInt',
    'PF2E.AbilityWis',
    'PF2E.AbilityCha',
    'PF2E.PotencyRuneLabel',
    'PF2E.AutomaticBonusProgression.attackPotency',
    'PF2E.AutomaticBonusProgression.defensePotency',
    'PF2E.AutomaticBonusProgression.savePotency',
    'PF2E.AutomaticBonusProgression.skillPotency',
    'PF2E.AutomaticBonusProgression.perceptionPotency',
    'PF2E.NPC.Adjustment.EliteLabel',
    'PF2E.NPC.Adjustment.WeakLabel',
    'Devise a Stratagem', // Investigator
    'Wild Shape', // Druid
    'Hunter\'s Edge: Flurry', // Ranger, replaces multiple attack penalty
    'Flurry', // same
    'Effect: Hunter\'s Edge, Flurry', // Ranger's companion
  ]
  IGNORED_MODIFIER_LABELS = IGNORED_MODIFIERS_I18N.map(str => game.i18n.localize(str))
}

const sumReducerMods = (accumulator, curr) => accumulator + curr.modifier
const sumReducerAcConditions = (accumulator, curr) => accumulator + curr.value
const isAcMod = m => m.group === 'ac' || m.group === 'all'
const valuePositive = m => m.value > 0
const valueNegative = m => m.value < 0
const modifierPositive = m => m.modifier > 0
const modifierNegative = m => m.modifier < 0
const acModOfCon = i => i.data.modifiers && i.data.modifiers.find(isAcMod)
const convertAcConditionsWithValuedValues = i => {
  if (!i.data.value || !i.data.value.isValued) return i
  const m = acModOfCon(i)
  if (!m) return i
  return {
    name: i.name,
    data: {
      modifiers: [
        {
          group: m.group,
          type: m.type,
          // value normally is undefined and calculated someplace else;  here I'm replacing it with a copy that has value
          value: -i.data.value.value,
        }],
    },
  }
}
const isAcSelector = m => m.selector === 'ac' || m.selector === 'all'
const convertAcConditionsWithRuleElements = i => {
  if (!i.data.rules) return i
  const acRule = i.data.rules.find(isAcSelector)
  if (!acRule) return i
  if (acRule.key !== 'FlatModifier') return i
  return {
    name: i.name,
    data: {
      modifiers: [
        {
          group: acRule.selector,
          type: acRule.type,
          // value normally is undefined and calculated someplace else;  here I'm replacing it with a copy that has value
          value: acRule.value,
        }],
    },
  }
}

const getShieldAcCondition = (targetedToken) => {
  const raisedShieldModifier = targetedToken.actor.getShieldBonus()
  if (raisedShieldModifier) return {
    name: raisedShieldModifier.label,
    data: {
      modifiers: [
        {
          group: 'ac',
          type: raisedShieldModifier.type,
          value: raisedShieldModifier.modifier,
        }],
    },
  }
}

const acConsOfToken = (targetedToken, isFlanking) => {
  const items = [
    ...(targetedToken.data.actorData.items || []),
    ...(targetedToken.actor.items.map(i => i.data) || []),
  ]
    // flanking - calculated by the system
    .concat(isFlanking ? [game.pf2e.ConditionManager.getCondition('flat-footed')] : [])
  return items
    .map(convertAcConditionsWithValuedValues)
    .map(convertAcConditionsWithRuleElements)
    // shield - calculated by the system. a 'effect-raise-a-shield' condition will also exist on the token but get filtered out
    .concat(targetedToken.actor.getShieldBonus() ? [getShieldAcCondition(targetedToken)] : [])
    .filter(i => acModOfCon(i) !== undefined)
    // remove duplicates where name is identical
    .filter((i1, idx, a) => a.findIndex(i2 => (i2.name === i1.name)) === idx)
    // remove items where condition can't stack;  by checking if another item has equal/higher mods of same type
    .filter((i1, idx, a) => {
      const m1 = acModOfCon(i1)
      if (m1.type === 'untyped') return true // untyped always stacks
      return a.findIndex(i2 => {
        const m2 = acModOfCon(i2)
        // status -1 and status -2 don't stack, but status -1 and status +2 do stack
        return m2.type === m1.type && Math.sign(m2.value) === Math.sign(m1.value) && Math.abs(m2.value) >=
          Math.abs(m1.value)
      }) === idx
    })
}

const acModsFromCons = (acConditions) => acConditions.map(c => c.data.modifiers).deepFlatten().filter(isAcMod)

const DEGREES = Object.freeze({
  CRIT_SUCC: 'CRIT_SUCC',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  CRIT_FAIL: 'CRIT_FAIL',
})

// REMEMBER:  in Pf2e, delta 0-9 means SUCCESS, delta 10+ means CRIT SUCCESS, delta -1-9 is FAIL, delta -10- is CRIT FAIL
const calcDegreeOfSuccess = (deltaFromDc) => {
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
  console.error(`calcDegreeOfSuccess got wrong number: ${deltaFromDc}`)
  return DEGREES.CRIT_FAIL
}
const calcDegreePlusRoll = (deltaFromDc, dieRoll) => {
  const degree = calcDegreeOfSuccess(deltaFromDc)
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
  }
  if (dieRoll === 1) {
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
  }
  return degree
}

const insertAcFlavorSuffix = (oldFlavor, acFlavorSuffix) => {
  if (oldFlavor.includes(`</b></div><div data-visibility="`)) {
    if (getSetting('show-defense-highlights-to-everyone'))
      // placed below GM-only visibility area
      return oldFlavor.replaceAll(
        `</b></div><div data-visibility="`,
        `</b></div><div><b>(${acFlavorSuffix})</b></div><div data-visibility="`,
      )
    else
      // placed inside GM-only visibility area
      return oldFlavor.replaceAll(
        `</b></div><div data-visibility="`,
        ` (${acFlavorSuffix})</b></div><div data-visibility="`,
      )
  } else if (oldFlavor.includes(`</span></b> </div><div class="tags"`)) {
    // compatibility fix for Pf2e Tweaks by Ustin
    if (getSetting('show-defense-highlights-to-everyone'))
      // placed below GM-only visibility area
      return oldFlavor.replaceAll(
        `</span></b> </div><div class="tags"`,
        `</span></b> </div><b>(${acFlavorSuffix})</b><div class="tags"`,
      )
    else
      // placed inside GM-only visibility area
      return oldFlavor.replaceAll(
        `</span></b> </div><div class="tags"`,
        `</span> (${acFlavorSuffix})</b> </div><div class="tags"`,
      )
  } else if (oldFlavor.includes(`</span></div><div data-visibility="`)) {
    // compatibility with Pf2e system 3.4.0 which added auto-flatfooted
    if (getSetting('show-defense-highlights-to-everyone'))
      // placed below GM-only visibility area
      return oldFlavor.replaceAll(
        `</span></div><div data-visibility="`,
        `</span></div><div><b>(${acFlavorSuffix})</b></div><div data-visibility="`,
      )
    else
      // placed inside GM-only visibility area
      return oldFlavor.replaceAll(
        `</span></div><div data-visibility="`,
        `</span> (${acFlavorSuffix})</div><div data-visibility="`,
      )
  } else {
    console.warn(`${MODULE_ID} | failed parsing chat message flavor text! please report this bug.`)
    console.warn(`${MODULE_ID} | printing oldFlavor...`)
    console.warn(oldFlavor)
    return oldFlavor
  }
}

const hook_preCreateChatMessage = async (chatMessage, data) => {
  // continue only if message is a PF2e roll message
  if (
    !data.flags
    || !data.flags.pf2e
    || data.flags.pf2e.modifiers === undefined
    || data.flags.pf2e.context.dc === undefined
    || data.flags.pf2e.context.dc === null
  ) return true

  // potentially include modifiers that apply to enemy AC (it's hard to do the same with ability/spell DCs though)
  const targetedToken = Array.from(game.user.targets)[0]
  const dcLabel = data.flags.pf2e.context.dc.label || '' // 'PF2E.Check.AC' as of PF2e v3.4.0
  const attackIsAgainstAc = dcLabel.includes('AC')
  const isFlanking = chatMessage.data.flags.pf2e.context.options.includes('self:flanking')
  const targetAcConditions = (attackIsAgainstAc && targetedToken !== undefined) ? acConsOfToken(targetedToken, isFlanking) : []

  const conMods = data.flags.pf2e.modifiers
    // enabled is false for one of the conditions if it can't stack with others
    .filter(m => m.enabled && !m.ignored && !IGNORED_MODIFIER_LABELS.includes(m.label))
  const conModsPositiveTotal = conMods.filter(modifierPositive).reduce(sumReducerMods, 0)
    - acModsFromCons(targetAcConditions).filter(valueNegative).reduce(sumReducerAcConditions, 0)
  const conModsNegativeTotal = conMods.filter(modifierNegative).reduce(sumReducerMods, 0)
    - acModsFromCons(targetAcConditions).filter(valuePositive).reduce(sumReducerAcConditions, 0)

  const shouldIgnoreThisDegreeOfSuccess = (oldDOS, newDOS) => {
    // only ignore in this somewhat common edge case:
    return (
      // fail changed to crit fail, or vice versa
      ((oldDOS === DEGREES.FAILURE && newDOS === DEGREES.CRIT_FAIL)
        || (oldDOS === DEGREES.CRIT_FAIL && newDOS === DEGREES.FAILURE))
      // and this game setting is enabled
      && getSetting('ignore-crit-fail-over-fail-on-attacks')
      // and it was a Strike attack
      && data.flavor.includes('Strike:')
    )
  }

  const rollTotal = parseInt(data.content || chatMessage.roll.total.toString())
  const rollDc = data.flags.pf2e.context.dc.value
  const deltaFromDc = rollTotal - rollDc
  // technically DoS can be higher or lower through nat 1 and nat 20, but it doesn't matter with this calculation
  const dieRoll = chatMessage.roll.terms[0].results[0].result
  const currentDegreeOfSuccess = calcDegreePlusRoll(deltaFromDc, dieRoll)
  // wouldChangeOutcome(x) returns true if a bonus of x ("penalty" if x is negative) changes the degree of success
  const wouldChangeOutcome = (extra) => {
    const newDegreeOfSuccess = calcDegreePlusRoll(deltaFromDc + extra, dieRoll)
    return newDegreeOfSuccess !== currentDegreeOfSuccess &&
      !shouldIgnoreThisDegreeOfSuccess(currentDegreeOfSuccess, newDegreeOfSuccess)
  }
  const positiveConditionsChangedOutcome = wouldChangeOutcome(-conModsPositiveTotal)
  const negativeConditionsChangedOutcome = wouldChangeOutcome(-conModsNegativeTotal)
  // sum of condition modifiers that were necessary to reach the current outcome - these are the biggest bonuses/penalties.
  const conModsNecessaryPositiveTotal = conMods
      .filter(m => m > 0 && wouldChangeOutcome(-m.modifier))
      .reduce(sumReducerMods, 0)
    - acModsFromCons(targetAcConditions)
      .filter(m => valueNegative(m) && wouldChangeOutcome(m.value))
      .reduce(sumReducerAcConditions, 0)
  const conModsNecessaryNegativeTotal = conMods
      .filter(m => m < 0 && wouldChangeOutcome(-m.modifier))
      .reduce(sumReducerMods, 0)
    - acModsFromCons(targetAcConditions)
      .filter(m => valuePositive(m) && wouldChangeOutcome(m.value))
      .reduce(sumReducerAcConditions, 0)
// sum of all other condition modifiers.  if this sum's changing does not affect the outcome it means conditions were unnecessary
  const remainingPositivesChangedOutcome = wouldChangeOutcome(-(conModsPositiveTotal - conModsNecessaryPositiveTotal))
  const remainingNegativesChangedOutcome = wouldChangeOutcome(-(conModsNegativeTotal - conModsNecessaryNegativeTotal))

  // utility, because this calculation is done multiple times but requires a bunch of calculated variables
  const calcOutcomeChangeColor = (modifier) => {
    const isNegativeMod = modifier < 0
    const changedOutcome = wouldChangeOutcome(-modifier)
    // return (not marking condition modifier at all) if this condition modifier was absolutely not necessary
    if (
      (!isNegativeMod && !positiveConditionsChangedOutcome)
      || (isNegativeMod && !negativeConditionsChangedOutcome)
      || (!isNegativeMod && !remainingPositivesChangedOutcome && !changedOutcome)
      || (isNegativeMod && !remainingNegativesChangedOutcome && !changedOutcome)
    )
      return undefined
    return isNegativeMod
      ? (changedOutcome ? NEGATIVE_COLOR : WEAK_NEGATIVE_COLOR)
      : (changedOutcome ? POSITIVE_COLOR : WEAK_POSITIVE_COLOR)
  }

  const oldFlavor = chatMessage.data.flavor
  let newFlavor = oldFlavor
  conMods.forEach(m => {
    const mod = m.modifier
    const outcomeChangeColor = calcOutcomeChangeColor(mod)
    if (!outcomeChangeColor) return
    const modifierValue = (mod < 0 ? '' : '+') + mod
    newFlavor = newFlavor.replaceAll(
      `<span class="tag tag_alt">${m.label} ${modifierValue}</span>`,
      `<span class="tag tag_alt" style="background-color: ${outcomeChangeColor}">${m.label} ${modifierValue}</span>`,
    )
  })
  const acFlavorSuffix = targetAcConditions.map(c => {
    const conditionAcMod = c.data.modifiers.filter(isAcMod).reduce(sumReducerAcConditions, -0)
    const outcomeChangeColor = calcOutcomeChangeColor(-conditionAcMod)
    if (!outcomeChangeColor) return undefined
    const modifierValue = (conditionAcMod < 0 ? '' : '+') + conditionAcMod
    const modifierName = c.name
    return `<span style="color: ${outcomeChangeColor}">${modifierName} ${modifierValue}</span>`
  }).filter(s => s !== undefined).join(', ')
  if (acFlavorSuffix) {
    newFlavor = insertAcFlavorSuffix(newFlavor, acFlavorSuffix)
  }

  if (newFlavor !== oldFlavor) {
    data.flavor = newFlavor
    await chatMessage.data.update({ 'flavor': newFlavor })
  }
  return true
}

const getSetting = (settingName) => game.settings.get(MODULE_ID, settingName)

Hooks.on('init', function () {
  game.settings.register(MODULE_ID, 'show-defense-highlights-to-everyone', {
    name: 'Show defense highlights to everyone',
    hint: 'If set to true, defense highlights such as "Flat-footed -2" will be shown to everyone, not just GM.',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
  })
  game.settings.register(MODULE_ID, 'ignore-crit-fail-over-fail-on-attacks', {
    name: 'Ignore Crit Fail over Fail on Attacks',
    hint: 'If set to true, the module will not highlight changes that changed an attack from a fail to a crit fail or vice versa.' +
      ' This is helpful because usually there\'s no difference between the two cases on attacks;  however, there are some' +
      ' exceptions to this rule, such as Confident Finisher.',
    scope: 'client',
    config: true,
    default: false,
    type: Boolean,
  })
})

Hooks.once('setup', function () {
  Hooks.on('preCreateChatMessage', hook_preCreateChatMessage)
  initializeIgnoredModifiers()
  console.info(`${MODULE_ID} | initialized`)
})

