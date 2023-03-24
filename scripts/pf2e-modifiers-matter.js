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
const NO_CHANGE_COLOR = '#000000'
const NEGATIVE_COLOR = '#ff0000'
const WEAK_NEGATIVE_COLOR = '#ff852f'
let IGNORED_MODIFIER_LABELS = []
let IGNORED_MODIFIER_LABELS_FOR_AC_ONLY = []

let warnedAboutLocalization = false
const tryLocalize = (key, defaultValue) => {
  const localized = game.i18n.localize(key)
  if (localized === key) {
    if (!warnedAboutLocalization) {
      console.warn(`${MODULE_ID}: failed to localize ${key}`)
      warnedAboutLocalization = true
    }
    return defaultValue
  }
  return localized
}

const initializeIgnoredModifiers = () => {
  const IGNORED_MODIFIERS_I18N = [
    'PF2E.BaseModifier',
    'PF2E.ModifierTitle',
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
    'PF2E.AutomaticBonusProgression.perceptionPotency',
    'PF2E.NPC.Adjustment.EliteLabel',
    'PF2E.NPC.Adjustment.WeakLabel',
    'PF2E.MasterSavingThrow.fortitude',
    'PF2E.MasterSavingThrow.reflex',
    'PF2E.MasterSavingThrow.will',
    `${MODULE_ID}.IgnoredModifiers.DeviseAStratagem`, // Investigator
    `${MODULE_ID}.IgnoredModifiers.HuntersEdgeFlurry1`, // Ranger, replaces multiple attack penalty
    `${MODULE_ID}.IgnoredModifiers.HuntersEdgeFlurry2`, // same
    `${MODULE_ID}.IgnoredModifiers.HuntersEdgeFlurry3`, // same, Ranger's companion
    // NOTE: all spells that end in "form" are also ignored for the attack bonus; e.g. Ooze Form
    // also some battle form spells with different names:
    `${MODULE_ID}.IgnoredModifiers.BattleForm1`, // battle form
    `${MODULE_ID}.IgnoredModifiers.BattleForm2`, // battle form
    `${MODULE_ID}.IgnoredModifiers.BattleForm3`, // battle form
    `${MODULE_ID}.IgnoredModifiers.BattleForm4`, // battle form
    // yes I'm gonna add my houserules to my module, you can't stop me.
    // https://discord.com/channels/880968862240239708/880969943724728391/1082678343234760704
    `${MODULE_ID}.IgnoredModifiers.SpellAttackHouserule`,
    `${MODULE_ID}.IgnoredModifiers.SpellPotency1`,
    `${MODULE_ID}.IgnoredModifiers.SpellPotency2`,
    `${MODULE_ID}.IgnoredModifiers.SkillPotency1`,
    `${MODULE_ID}.IgnoredModifiers.SkillPotency2`,
  ]
  IGNORED_MODIFIER_LABELS = IGNORED_MODIFIERS_I18N.map(str => tryLocalize(str, str)).
    concat(getSetting('additional-ignored-labels').split(';'))
  IGNORED_MODIFIER_LABELS_FOR_AC_ONLY = [
    // effect that replaces your AC item bonus and dex cap - super hard to calculate its "true" bonus so I just ignore.
    // however, this effect also has other modifiers which I don't want to ignore.
    `${MODULE_ID}.IgnoredModifiers.DrakeheartMutagen`,
  ].map(str => tryLocalize(str, str))
}

const sumReducerMods = (accumulator, curr) => accumulator + curr.modifier
const sumReducerAcConditions = (accumulator, curr) => accumulator + curr.value
const isAcMod = m => m.group === 'ac' || m.group === 'all'
const valuePositive = m => m.value > 0
const valueNegative = m => m.value < 0
const modifierPositive = m => m.modifier > 0
const modifierNegative = m => m.modifier < 0
const acModOfCon = i => i.modifiers?.find(isAcMod)
const convertAcModifier = m => {
  if (!m.enabled && m.ignored) return m
  return {
    name: m.label,
    modifiers: [
      {
        group: 'ac',
        type: m.type,
        value: m.modifier,
      }],
  }
}
const getShieldAcCondition = (targetedToken) => {
  const raisedShieldModifier = targetedToken.actor.getShieldBonus()
  if (raisedShieldModifier) return {
    name: raisedShieldModifier.label,
    modifiers: [
      {
        group: 'ac',
        type: raisedShieldModifier.type,
        value: raisedShieldModifier.modifier,
      },
    ],
  }
}

const getFlankingAcCondition = () => {
  const systemFlanking = game.pf2e.ConditionManager.getCondition('flat-footed')
  return {
    name: systemFlanking.name,
    modifiers: [
      {
        group: 'ac',
        type: 'circumstance',
        value: -2,
      },
    ],
  }
}
const acConsOfToken = (targetedToken, isFlanking) => {
  const nameOfArmor = targetedToken.actor.attributes.ac.dexCap?.source || 'Modifier' // "Modifier" for NPCs
  return [].concat(targetedToken.actor.attributes.ac.modifiers.map(convertAcModifier))
    // shield - calculated by the system. a 'effect-raise-a-shield' condition will also exist on the token but get filtered out
    .concat(targetedToken.actor.getShieldBonus() ? [getShieldAcCondition(targetedToken)] : [])
    // flanking - calculated by the system
    .concat(isFlanking ? [getFlankingAcCondition()] : [])
    // remove all non-AC conditions and irrelevant items
    .filter(i => acModOfCon(i) !== undefined)
    // ignore armor because it's a passive constant (dex and prof are already in IGNORED_MODIFIER_LABELS)
    .filter(i => i.name !== nameOfArmor)
    // remove duplicates where name is identical
    .filter((i1, idx, a) => a.findIndex(i2 => (i2.name === i1.name)) === idx)
    // remove items where condition can't stack;  by checking if another item has equal/higher mods of same type
    .filter((i1, idx1, a) => {
      const m1 = acModOfCon(i1)
      if (m1.type === 'untyped') return true // untyped always stacks
      // keeping if there isn't another mod item that this won't stack with
      return a.find((i2, idx2) => {
        const m2 = acModOfCon(i2)
        // looking for something with a different index
        return i1 !== i2
          // of the same type
          && m2.type === m1.type
          // with the same sign (-1 and -2 don't stack, but -1 and +2 do)
          && Math.sign(m2.value) === Math.sign(m1.value)
          && (
            // with higher value (if higher index)
            (Math.abs(m2.value) >= Math.abs(m1.value) && idx1 > idx2)
            // or equal-to-higher value (if lower index)
            || (Math.abs(m2.value) > Math.abs(m1.value) && idx1 < idx2)
          )
      }) === undefined
    })
    // remove everything that should be ignored (including user-defined)
    .filter(i => !IGNORED_MODIFIER_LABELS.includes(i.name)).
    filter(i => !IGNORED_MODIFIER_LABELS_FOR_AC_ONLY.includes(i.name))
}

const acModsFromCons = (acConditions) => acConditions.map(c => c.modifiers).deepFlatten().filter(isAcMod)

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
  console.error(`${MODULE_ID} | calcDegreeOfSuccess got wrong number: ${deltaFromDc}`)
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

/**
 * acFlavorSuffix will be e.g. 'Flatfooted -2, Frightened -1'
 */
const insertAcFlavorSuffix = ($flavorText, acFlavorSuffix) => {
  const showDefenseHighlightsToEveryone = getSetting('show-defense-highlights-to-everyone')
  const dataVisibility = showDefenseHighlightsToEveryone ? 'all' : 'gm'
  $flavorText.find('div.degree-of-success').before(
    `<div data-visibility="${dataVisibility}">
${tryLocalize(`${MODULE_ID}.Message.TargetHas`, 'Target has:')} <b>(${acFlavorSuffix})</b>
</div>`)
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
  const rollingActor = data.flags.pf2e.context.actor ? game.actors.get(data.flags.pf2e.context.actor) : undefined
  const dcObj = data.flags.pf2e.context.dc
  const attackIsAgainstAc = dcObj.slug === 'ac'
  const isFlanking = chatMessage.flags.pf2e.context.options.includes('self:flanking')
  const targetAcConditions = (attackIsAgainstAc && targetedToken !== undefined) ? acConsOfToken(targetedToken,
    isFlanking) : []

  const conMods = data.flags.pf2e.modifiers
    // enabled is false for one of the conditions if it can't stack with others
    .filter(m => m.enabled && !m.ignored && !IGNORED_MODIFIER_LABELS.includes(m.label))
    // ignoring all "form" spells that replace your attack bonus
    .filter(m => !(attackIsAgainstAc && m.slug.endsWith('-form')))
    // ignoring Doubling Rings which are basically a permanent item bonus
    .filter(m => !m.slug.startsWith('doubling-rings'))
    // for saving throws, ignore item bonuses that come from armor, they're Resilient runes
    .filter(m => !(
      !attackIsAgainstAc
      && m.type === 'item'
      // comparing the modifier label to the name of the rolling actor's Armor item
      && rollingActor?.attributes.ac.modifiers.some(m2 => m2.label === m.label)
      // matching roll type to "Xxxx Saving Throw", trying to make it work for all languages
      && data.flags.pf2e.modifierName.match(game.i18n.localize('PF2E.SavingThrowWithName').replace('{saveName}', '.'))
    ))
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
      && data.flavor.includes(`${tryLocalize('PF2E.WeaponStrikeLabel', 'Strike')}:`)
    )
  }

  const roll = chatMessage.rolls[0]  // I hope the main roll is always the first one!
  const rollTotal = parseInt(data.content || roll.total.toString())
  const rollDc = data.flags.pf2e.context.dc.value
  const deltaFromDc = rollTotal - rollDc
  // technically DoS can be higher or lower through nat 1 and nat 20, but it doesn't matter with this calculation
  const dieRoll = roll.terms[0].results[0].result
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
  const conModsNecessaryPositiveTotal = conMods.filter(m => modifierPositive(m) && wouldChangeOutcome(-m.modifier)).
      reduce(sumReducerMods, 0)
    - acModsFromCons(targetAcConditions).
      filter(m => valueNegative(m) && wouldChangeOutcome(m.value)).
      reduce(sumReducerAcConditions, 0)
  const conModsNecessaryNegativeTotal = conMods.filter(m => modifierNegative(m) && wouldChangeOutcome(-m.modifier)).
      reduce(sumReducerMods, 0)
    - acModsFromCons(targetAcConditions).
      filter(m => valuePositive(m) && wouldChangeOutcome(m.value)).
      reduce(sumReducerAcConditions, 0)
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

  const oldFlavor = chatMessage.flavor
  // adding an artificial div to have a single parent element, enabling nicer editing of html
  const $editedFlavor = $(`<div>${oldFlavor}</div>`)
  conMods.forEach(m => {
    const mod = m.modifier
    const outcomeChangeColor = calcOutcomeChangeColor(mod)
    if (!outcomeChangeColor) return
    const modifierValue = (mod < 0 ? '' : '+') + mod
    // edit background color for full tags
    $editedFlavor.find(`span.tag:contains(${m.label} ${modifierValue}).tag_alt`).
      css('background-color', outcomeChangeColor)
    // edit background+text colors for transparent tags, which have dark text by default
    $editedFlavor.find(`span.tag:contains(${m.label} ${modifierValue}).tag_transparent`).
      css('color', outcomeChangeColor).
      css('font-weight', 'bold')
  })
  const acFlavorSuffix = targetAcConditions.map(c => {
    const conditionAcMod = c.modifiers.filter(isAcMod).reduce(sumReducerAcConditions, -0)
    let outcomeChangeColor = calcOutcomeChangeColor(-conditionAcMod)
    if (!outcomeChangeColor) {
      if (getSetting('always-show-defense-conditions', false)) {
        outcomeChangeColor = NO_CHANGE_COLOR
      } else {
        return undefined
      }
    }
    const modifierValue = (conditionAcMod < 0 ? '' : '+') + conditionAcMod
    const modifierName = c.name
    return `<span style="color: ${outcomeChangeColor}">${modifierName} ${modifierValue}</span>`
  }).filter(s => s !== undefined).join(', ')
  if (acFlavorSuffix) {
    insertAcFlavorSuffix($editedFlavor, acFlavorSuffix)
  }
  // newFlavor will be the inner HTML without the artificial div
  const newFlavor = $editedFlavor.html()
  if (newFlavor !== oldFlavor) {
    data.flavor = newFlavor

    await chatMessage.updateSource({ 'flavor': newFlavor })
  }
  return true
}

const getSetting = (settingName) => game.settings.get(MODULE_ID, settingName)

Hooks.on('init', function () {
  game.settings.register(MODULE_ID, 'show-defense-highlights-to-everyone', {
    name: `${MODULE_ID}.Settings.show-defense-highlights-to-everyone.name`,
    hint: `${MODULE_ID}.Settings.show-defense-highlights-to-everyone.hint`,
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
  })
  game.settings.register(MODULE_ID, 'ignore-crit-fail-over-fail-on-attacks', {
    name: `${MODULE_ID}.Settings.ignore-crit-fail-over-fail-on-attacks.name`,
    hint: `${MODULE_ID}.Settings.ignore-crit-fail-over-fail-on-attacks.hint`,
    scope: 'client',
    config: true,
    default: false,
    type: Boolean,
  })
  game.settings.register(MODULE_ID, 'additional-ignored-labels', {
    name: `${MODULE_ID}.Settings.additional-ignored-labels.name`,
    hint: `${MODULE_ID}.Settings.additional-ignored-labels.hint`,
    scope: 'world',
    config: true,
    default: 'Example;Skill Potency',
    type: String,
    onChange: initializeIgnoredModifiers,
  })
  game.settings.register(MODULE_ID, 'always-show-defense-conditions', {
    name: `${MODULE_ID}.Settings.always-show-defense-conditions.name`,
    hint: `${MODULE_ID}.Settings.always-show-defense-conditions.hint`,
    scope: 'world',
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

