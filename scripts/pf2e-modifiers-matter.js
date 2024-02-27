const MODULE_ID = 'pf2e-modifiers-matter'
// TODO - currently impossible, but in the future may be possible to react to effects that change embedded DCs in Note rule elements.
// See:  https://github.com/foundryvtt/pf2e/issues/9824
// for example, the Monk's Stunning Fist uses a Class DC but this module won't recognize modifiers to that DC in this situation.

// Helpful for testing - replace random dice roller with 1,2,3,4....19,20 by putting this in the console:
/*
NEXT_RND_ROLLS_D20 = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
rndIndex = -1
CONFIG.Dice.randomUniform = () => {rndIndex = (rndIndex + 1) % NEXT_RND_ROLLS_D20.length; return NEXT_RND_ROLLS_D20[rndIndex] / 20 - 0.001}
 */

// this file has a ton of math (mostly simple).
// I did my best to make it all easily understandable math, but there are limits to what I can do.

/**
 * ESSENTIAL (strong green) - This modifier was necessary to achieve this degree of success (DoS).  Others were
 * potentially also necessary.  You should thank the character who caused this modifier!
 *
 * HELPFUL (weak green) - This modifier was not necessary to achieve this DoS, but degree of success did change due to
 * modifiers in this direction, and at least one of the helpful modifiers was needed.  For example, if you rolled a 14,
 * had +1 & +2, and needed a 15, both the +1 and +2 are weak green because neither is necessary on its own, but they
 * were necessary together. If you had rolled a 13 in this case, the +2 would be strong green but the +1 would still be
 * weak green, simply because it's difficult to come up with an algorithm that would solve complex cases.
 * Note, by the way, that in case of multiple non-stacking modifiers, PF2e hides some of them from the chat card.
 *
 * NONE - This modifier did not affect the DoS at all, this time.
 *
 * HARMFUL (orange) - Like HELPFUL but in the opposite direction.  Without all the harmful modifiers you had (but
 * not without any one of them), you would've gotten a better DoS.
 *
 * DETRIMENTAL (red) - Like ESSENTIAL but in the opposite direction.  Without this, you would've gotten a better DoS.
 */
const SIGNIFICANCE = Object.freeze({
  ESSENTIAL: 'ESSENTIAL',
  HELPFUL: 'HELPFUL',
  NONE: 'NONE',
  HARMFUL: 'HARMFUL',
  DETRIMENTAL: 'DETRIMENTAL',
})
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
    'PF2E.RuleElement.WeaponPotency',
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
    // compatibility with a module, pf2e-flatten, which adds modifiers to match the PWoL variants.
    // https://github.com/League-of-Foundry-Developers/pf2e-flatten/blob/main/bundle.js#L41
    `${MODULE_ID}.IgnoredModifiers3p.pf2e-flatten_pwol`,
    `${MODULE_ID}.IgnoredModifiers3p.pf2e-flatten_pwol_half`,
  ]
  IGNORED_MODIFIER_LABELS = IGNORED_MODIFIERS_I18N.map(str => tryLocalize(str, str)).
    concat(getSetting('additional-ignored-labels').split(';'))
  IGNORED_MODIFIER_LABELS_FOR_AC_ONLY = [
    // effect that replaces your AC item bonus and dex cap - super hard to calculate its "true" bonus so I just ignore.
    // however, this effect also has other modifiers which I don't want to ignore.
    `${MODULE_ID}.IgnoredModifiers.DrakeheartMutagen`,
  ].map(str => tryLocalize(str, str))
}

const sumMods = (modsList) => modsList.reduce((accumulator, curr) => accumulator + curr.modifier, 0)
const modifierPositive = m => m.modifier > 0
const modifierNegative = m => m.modifier < 0
const getOffGuardAcMod = () => {
  const offGuardSlug = isNewerVersion(game.version, '5.3') ? 'off-guard' : 'flat-footed'
  const systemOffGuardCondition = game.pf2e.ConditionManager.getCondition(offGuardSlug)
  return {
    label: systemOffGuardCondition.name,
    modifier: -2,
    type: 'circumstance',
  }
}
const dcModsOfStatistic = (dcStatistic, actorWithDc) => {
  return dcStatistic.modifiers
    // remove if not enabled, or ignored
    .filter(m => m.enabled && !m.ignored)
    // remove everything that should be ignored (including user-defined)
    .filter(m => !IGNORED_MODIFIER_LABELS.includes(m.label))
    // ignore item bonuses that come from armor, they're Resilient runes
    .filter(m => !(
      m.type === 'item'
      // comparing the modifier label to the names of the actor's Armor items
      && actorWithDc?.attributes.ac.modifiers.some(m2 => m2.label === m.label)
    ))
}
const rollModsFromChatMessage = (modifiersFromChatMessage, rollingActor, dcType) => {
  return modifiersFromChatMessage
    // enabled is false for one of the conditions if it can't stack with others
    .filter(m => m.enabled && !m.ignored)
    // ignoring standard things from list (including user-defined)
    .filter(m => !IGNORED_MODIFIER_LABELS.includes(m.label))
    // for attacks, ignore all "form" spells that replace your attack bonus
    .filter(m => !((dcType === 'armor' || dcType === 'ac') && m.slug.endsWith('-form')))
    // for attacks/skills, ignore Doubling Rings which are basically a permanent item bonus
    .filter(m => !m.slug.startsWith('doubling-rings'))
    // TODO - ignore item bonuses that are permanent (mostly skill items)

    // TODO - can next thing be removed?
    // for saving throws, ignore item bonuses that come from armor, they're Resilient runes
    .filter(m => !(
      m.type === 'item'
      // comparing the modifier label to the name of the rolling actor's Armor item
      && rollingActor?.attributes.ac.modifiers.some(m2 => m2.label === m.label)
    ))
}

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

const shouldIgnoreStrikeCritFailToFail = (oldDOS, newDOS, isStrike) => {
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
 * dcFlavorSuffix will be e.g. 'Off-Guard -2, Frightened -1'
 */
const insertDcFlavorSuffix = ($flavorText, dcFlavorSuffix, dcActorType) => {
  const showHighlightsToEveryone = getSetting('always-show-highlights-to-everyone')
  const dataVisibility = showHighlightsToEveryone ? 'all' : 'gm'
  const messageKey = dcActorType === 'target' ? `${MODULE_ID}.Message.TargetHas`
    : dcActorType === 'caster' ? `${MODULE_ID}.Message.CasterHas`
      : `${MODULE_ID}.Message.ActorHas`
  $flavorText.find('div.degree-of-success').before(
    `<div data-visibility="${dataVisibility}">
${tryLocalize(messageKey, 'Target has:')} <b>${dcFlavorSuffix}</b>
</div>`)
}

const hook_preCreateChatMessage = async (chatMessage, data) => {
  // continue only if message is a PF2e roll message with a rolling actor
  if (
    !chatMessage.flags
    || !chatMessage.flags.pf2e
    || !chatMessage.flags.pf2e.modifiers
    || !chatMessage.flags.pf2e.context.dc
    || !chatMessage.flags.pf2e.context.actor
  ) return true

  const rollingActor = game.actors.get(chatMessage.flags.pf2e.context.actor)
  // here I assume the PF2E system always includes the d20 roll as the first roll!  and as the first term of that roll!
  const roll = chatMessage.rolls[0]
  const rollTotal = roll?.total !== undefined ? roll.total : parseInt(chatMessage.content)
  // dc.value is usually defined, but apparently not when Escaping vs an enemy's Athletics DC
  const rollDc = chatMessage.flags.pf2e.context.dc.value ?? chatMessage.flags.pf2e.context.dc.parent?.dc?.value
  const deltaFromDc = rollTotal - rollDc
  // using roll.terms[0].total will work when rolling 1d20+9, or 2d20kh+9 (RollTwice RE), or 10+9 (SubstituteRoll RE)
  const dieRoll = roll.terms[0].total
  const currentDegreeOfSuccess = calcDegreePlusRoll(deltaFromDc, dieRoll)
  const dcSlug = chatMessage.flags.pf2e.context.dc.slug ?? chatMessage.flags.pf2e.context.dc.parent?.slug
  const isStrike = dcSlug === 'armor' || dcSlug === 'ac'
  const isSpell = chatMessage.flags.pf2e.origin?.type === 'spell'
  const targetedTokenUuid = chatMessage.flags.pf2e.context.target?.token
  const targetedActorUuid = chatMessage.flags.pf2e.context.target?.actor
  const targetedToken = targetedTokenUuid ? fromUuidSync(targetedTokenUuid) : undefined
  // targetedActorUuid will return the TOKEN uuid if it's an unlinked token!  so, we're probably going to ignore it
  const targetedActor = targetedToken?.actor ? targetedToken.actor
    : targetedActorUuid ? fromUuidSync(targetedActorUuid)
      : undefined
  const originUuid = chatMessage.flags.pf2e.origin?.uuid
  const originItem = originUuid ? fromUuidSync(originUuid) : undefined
  const allModifiersInChatMessage = chatMessage.flags.pf2e.modifiers
  /*
  NOTE - from this point on, I use the term "modifier" or "mod" to refer to conditions/effects/feats that have granted
  a bonus or penalty to the roll or to the DC the roll was against.  I will filter rollMods and dcMods to only include
  relevant non-ignored modifiers, and then calculate which modifiers actually made a significant impact on the outcome.

  The "modifier" objects in these lists are generally ModifierPf2e class objects, which have a "label", a "type", and
  a "modifier" field (their signed numerical value).
   */
  const rollMods = rollModsFromChatMessage(allModifiersInChatMessage, rollingActor, dcSlug)
  let dcMods
  let actorWithDc
  if (isStrike && targetedActor) {
    actorWithDc = targetedActor
    dcMods = dcModsOfStatistic(targetedActor.system.attributes.ac, actorWithDc)
    const offGuardMod = getOffGuardAcMod()
    const isTargetEphemerallyOffGuard = chatMessage.flags.pf2e.context.options.includes(
      'target:condition:off-guard')
    if (isTargetEphemerallyOffGuard && !dcMods.some(m => m.label === offGuardMod.label)) {
      const messageFlavorHtml = $(`<div>${chatMessage.flavor}</div>`)
      const dcTooltipsStr = messageFlavorHtml.find('div.target-dc > span > span.adjusted').attr('data-tooltip')
      if (dcTooltipsStr === undefined) {
        // TODO - find when it happens and fix it
        console.error(`${MODULE_ID} | failed to find target DC tooltips in message flavor:`, chatMessage.flavor)
        console.error(`${MODULE_ID} | message flavor as string: ${chatMessage.flavor}`)
        console.error(
          `${MODULE_ID} | please show these three error messages to shemetz on Discord and include a bit of context to explain what happened! 🙏`)
        offGuardMod.label = 'Off-Guard'
        dcMods.push(offGuardMod)
      } else {
        const dcTooltips = dcTooltipsStr.split('\n').map(s => s.replace('<div>', '').replace('</div>', ''))
        const offGuardTooltip = dcTooltips.find(t => t.includes(game.i18n.localize('PF2E.condition.off-guard.name')))
        offGuardMod.label = offGuardTooltip.split(':')[0]
        dcMods.push(offGuardMod)
      }
    }
    dcMods = dcMods.filter(m => !IGNORED_MODIFIER_LABELS_FOR_AC_ONLY.includes(m.label))
  } else if (isSpell && !!originItem) {
    // (note:  originItem will be undefined in the rare case of a message created through a module like Quick Send To Chat)
    // if saving against spell, DC is the Spellcasting DC which means it's affected by stuff like Frightened and Stupefied
    actorWithDc = originItem.actor
    dcMods = dcModsOfStatistic(originItem.spellcasting.statistic.dc, actorWithDc)
  } else if (originItem?.category === 'class') {
    // if saving against a class feat/feature, DC is the Class DC which means it's affected by stuff like Frightened and Enfeebled/Drained/etc, depending
    // NOTE:  this will not work for embedded Check buttons that come from Note REs.  see https://github.com/foundryvtt/pf2e/issues/9824
    actorWithDc = originItem.actor
    dcMods = dcModsOfStatistic(originItem.parent.classDC, actorWithDc)
  } else if (targetedActor && dcSlug) {
    // if there's a target, but it's not an attack, then it's probably a skill check against one of the target's
    // save DCs or perception DC or possibly a skill DC
    actorWithDc = targetedActor
    const dcStatistic = targetedActor.saves[dcSlug] || targetedActor.skills[dcSlug] || targetedActor[dcSlug]
    // dcStatistic should always be defined.  (otherwise it means I didn't account for all cases here!)
    dcMods = dcModsOfStatistic(dcStatistic.dc, actorWithDc)
  } else {
    // happens if e.g. rolling from a @Check style button
    dcMods = []
  }

  /**
   * wouldChangeOutcome(x) returns true if a bonus of x ("penalty" if x is negative) changes the degree of success
   */
  const wouldChangeOutcome = (extra) => {
    const newDegreeOfSuccess = calcDegreePlusRoll(deltaFromDc + extra, dieRoll)
    return newDegreeOfSuccess !== currentDegreeOfSuccess &&
      !shouldIgnoreStrikeCritFailToFail(currentDegreeOfSuccess, newDegreeOfSuccess, isStrike)
  }

  const positiveRollMods = rollMods.filter(modifierPositive)
  const negativeRollMods = rollMods.filter(modifierNegative)
  const positiveDcMods = dcMods.filter(modifierPositive)
  const negativeDcMods = dcMods.filter(modifierNegative)
  const necessaryPositiveRollMods = positiveRollMods.filter(m => wouldChangeOutcome(-m.modifier))
  const necessaryNegativeRollMods = negativeRollMods.filter(m => wouldChangeOutcome(-m.modifier))
  const necessaryPositiveDcMods = positiveDcMods.filter(m => wouldChangeOutcome(m.modifier))
  const necessaryNegativeDcMods = negativeDcMods.filter(m => wouldChangeOutcome(m.modifier))
  const rollModsPositiveTotal = sumMods(positiveRollMods) - sumMods(negativeDcMods)
  const rollModsNegativeTotal = sumMods(negativeRollMods) - sumMods(positiveDcMods)
  // sum of modifiers that were necessary to reach the current outcome - these are the biggest bonuses/penalties.
  const rollModsNecessaryPositiveTotal = sumMods(necessaryPositiveRollMods) - sumMods(necessaryPositiveDcMods)
  const rollModsNecessaryNegativeTotal = sumMods(necessaryNegativeRollMods) - sumMods(necessaryNegativeDcMods)
  // sum of all other modifiers.  if this sum's changing does not affect the outcome it means modifiers were unnecessary
  const rollModsRemainingPositiveTotal = rollModsPositiveTotal - rollModsNecessaryPositiveTotal
  const rollModsRemainingNegativeTotal = rollModsNegativeTotal - rollModsNecessaryNegativeTotal
  // based on the above sums and the following booleans, we can determine which modifiers were significant and how much
  const didPositiveModifiersChangeOutcome = wouldChangeOutcome(-rollModsPositiveTotal)
  const didNegativeModifiersChangeOutcome = wouldChangeOutcome(-rollModsNegativeTotal)
  const didRemainingPositivesChangeOutcome = wouldChangeOutcome(-rollModsRemainingPositiveTotal)
  const didRemainingNegativesChangeOutcome = wouldChangeOutcome(-rollModsRemainingNegativeTotal)

  const calcSignificance = (modifierValue) => {
    const isNegativeMod = modifierValue < 0
    const isPositiveMod = modifierValue > 0
    const changedOutcome = wouldChangeOutcome(-modifierValue)
    if (isPositiveMod && changedOutcome)
      return SIGNIFICANCE.ESSENTIAL
    if (isPositiveMod && !changedOutcome && didPositiveModifiersChangeOutcome && didRemainingPositivesChangeOutcome)
      return SIGNIFICANCE.HELPFUL
    if (isNegativeMod && changedOutcome)
      return SIGNIFICANCE.HARMFUL
    if (isNegativeMod && !changedOutcome && didNegativeModifiersChangeOutcome && didRemainingNegativesChangeOutcome)
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

  const oldFlavor = chatMessage.flavor
  // adding an artificial div to have a single parent element, enabling nicer editing of html
  const $editedFlavor = $(`<div>${oldFlavor}</div>`)
  // remove old highlights, in case of a reroll within the same message
  $editedFlavor.find('.pf2emm-highlight').
    removeClass('pf2emm-highlight').
    removeClass(`pf2emm-is-${SIGNIFICANCE.HARMFUL}`).
    removeClass(`pf2emm-is-${SIGNIFICANCE.HELPFUL}`).
    removeClass(`pf2emm-is-${SIGNIFICANCE.ESSENTIAL}`).
    removeClass(`pf2emm-is-${SIGNIFICANCE.DETRIMENTAL}`)
  const showHighlightsToEveryone = getSetting('always-show-highlights-to-everyone')
  significantRollModifiers.forEach(m => {
    const modVal = m.value
    const modName = m.name
    const modSignificance = m.significance
    const modValStr = (modVal < 0 ? '' : '+') + modVal
    $editedFlavor.find(`span.tag:contains(${modName} ${modValStr})`).
      addClass('pf2emm-highlight').
      addClass(`pf2emm-is-${modSignificance}`)
    if (showHighlightsToEveryone)
      $editedFlavor.find(`span.tag:contains(${modName} ${modValStr})`).
        attr('data-visibility', 'all')
  })
  const dcFlavorSuffixHtmls = []
  significantDcModifiers.forEach(m => {
    const modVal = m.value
    const modName = m.name
    const modSignificance = m.significance
    // remove number from end of name, because it's better to see "Frightened (-3)" than "Frightened 3 (-3)"
    const modNameNoNum = modName.match(/.* \d+/) ? modName.substring(0, modName.lastIndexOf(' ')) : modName
    const modValStr = (modVal < 0 ? '' : '+') + modVal
    dcFlavorSuffixHtmls.push(
      `<span class="pf2emm-suffix pf2emm-is-${modSignificance}">${modNameNoNum} ${modValStr}</span>`)
  })
  insignificantDcModifiers.forEach(m => {
    const modVal = m.value
    const modName = m.name
    if (!(isStrike && getSetting('always-show-defense-conditions', false)))
      return
    // remove number from end of name, because it's better to see "Frightened (-3)" than "Frightened 3 (-3)"
    const modNameNoNum = modName.match(/.* \d+/) ? modName.substring(0, modName.lastIndexOf(' ')) : modName
    const modValStr = (modVal < 0 ? '' : '+') + modVal
    dcFlavorSuffixHtmls.push(`<span class="pf2emm-suffix pf2emm-is-NONE">${modNameNoNum} ${modValStr}</span>`)
  })
  const dcFlavorSuffix = dcFlavorSuffixHtmls.join(', ')
  $editedFlavor.find('.pf2emm-suffix').remove()
  if (dcFlavorSuffix) {
    // dcActorType is only used to make the string slightly more fitting
    const dcActorType = targetedActor ? 'target' : isSpell ? 'caster' : 'actor'
    insertDcFlavorSuffix($editedFlavor, dcFlavorSuffix, dcActorType)
  }
  // newFlavor will be the inner HTML without the artificial div
  const newFlavor = $editedFlavor.html()
  if (newFlavor !== oldFlavor) {
    data.flavor = newFlavor // just in case other hooks rely on it
    await chatMessage.updateSource({ 'flavor': newFlavor })
  }

  // hook call - to allow other modules/macros to trigger based on MM
  const significantModifiers = significantRollModifiers.concat(significantDcModifiers)
  if (significantModifiers.length > 0) {
    Hooks.callAll('modifiersMatter', {
      rollingActor,
      actorWithDc, // can be undefined
      targetedToken, // can be undefined
      significantModifiers, // list of: {name: string, value: number, significance: string}, significance is never NONE
      chatMessage,
    })
  }

  return true
}

const exampleHookInspireCourage = () => {
  // this hook call is an example!
  // it will play a nice chime sound each time an Inspire Courage effect turns a miss into a hit (or hit to crit)
  Hooks.on('modifiersMatter', ({ rollingActor, significantModifiers }) => {
    console.log(`${rollingActor} was helped!`)
    significantModifiers.forEach(({ name, significance }) => {
      if (name.includes('Inspire Courage') && significance === 'ESSENTIAL') {
        AudioHelper.play({
          src: 'https://cdn.pixabay.com/audio/2022/01/18/audio_8db1f1b5a5.mp3',
          volume: 1.0,
          autoplay: true,
          loop: false,
        }, true)
      }
    })
  })
}

const getSetting = (settingName) => game.settings.get(MODULE_ID, settingName)

Hooks.on('init', function () {
  game.settings.register(MODULE_ID, 'always-show-highlights-to-everyone', {
    name: `${MODULE_ID}.Settings.always-show-highlights-to-everyone.name`,
    hint: `${MODULE_ID}.Settings.always-show-highlights-to-everyone.hint`,
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

