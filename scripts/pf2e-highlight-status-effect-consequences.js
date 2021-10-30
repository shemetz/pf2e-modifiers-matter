const MODULE_ID = 'pf2e-highlight-status-effect-consequences'
// TODO - figure out how to notice effects on the target that change their Ref/Fort/Will DC, e.g. when trying to Tumble Through against targeted enemy

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
const POSITIVE_COLOR = '#00aa11'
const WEAK_POSITIVE_COLOR = '#779944'
const NEGATIVE_COLOR = '#ff4400'
const WEAK_NEGATIVE_COLOR = '#ef7f0d'
const IGNORED_MODIFIERS = [
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
  'Attack Potency', // from Advanced Bonus Progression
]
const sumReducerMods = (accumulator, curr) => accumulator + curr.modifier
const sumReducerAcConditions = (accumulator, curr) => accumulator + curr.value
const isAcMod = m => m.group === 'ac' || m.group === 'all'
const valuePositive = m => m.value > 0
const valueNegative = m => m.value < 0
const modifierPositive = m => m.modifier > 0
const modifierNegative = m => m.modifier < 0
const acModOfCon = i => i.data.modifiers.find(isAcMod)
const fixFrightenedCondition = i => {
  if (!i.data.value.isValued) return i
  const m = acModOfCon(i)
  return {
    name: i.name,
    data: {
      modifiers: [{
        group: m.group,
        type: m.type,
        // value normally is undefined and calculated someplace else;  here I'm replacing it with a copy that has value
        value: -i.data.value.value
      }]
    }
  }
}
const acConsOfToken = (targetedToken) => {
  return targetedToken.data.actorData.items
    .filter(i => acModOfCon(i) !== undefined)
    // remove duplicates where name is identical
    .filter((i1, idx, a) => a.findIndex(i2 => (i2.name === i1.name)) === idx)
    .map(fixFrightenedCondition)
    // remove items where condition can't stack;  by checking if another item has equal/higher mods of same type
    .filter((i1, idx, a) => {
      const m1 = acModOfCon(i1)
      if (m1.type === 'untyped') return true // untyped always stacks
      return a.findIndex(i2 => {
        const m2 = acModOfCon(i2)
        // status -1 and status -2 don't stack, but status -1 and status +2 do stack
        return m2.type === m1.type && Math.sign(m2.value) === Math.sign(m1.value) && Math.abs(m2.value) >= Math.abs(m1.value)
      }) === idx
    })
}

const acModsFromCons = (acConditions) => acConditions.map(c => c.data.modifiers).deepFlatten().filter(isAcMod)

const hook_preCreateChatMessage = async (chatMessage, data) => {
  if (!getSetting('module-enabled')) return true
  // continue only if message is a PF2e roll message
  if (!data.flags || !data.flags.pf2e || data.flags.pf2e.modifiers === undefined || data.flags.pf2e.context.dc === undefined) return true

  // potentially include modifiers that apply to enemy AC (it's hard to do the same with ability/spell DCs though)
  const targetedToken = Array.from(game.user.targets)[0]
  const dcLabel = data.flags.pf2e.context.dc.label || ''
  const attackIsAgainstAc = dcLabel.includes('AC:')
  const targetAcConditions = (attackIsAgainstAc && targetedToken !== undefined) ? acConsOfToken(targetedToken) : []

  const conMods = data.flags.pf2e.modifiers
    .filter(m => !IGNORED_MODIFIERS.includes(m.name))
    .filter(m => m.enabled && !m.ignored) // enabled is false for one of the conditions if it can't stack with others
  const existConModsPositive = conMods.filter(m => m.modifier > 0).length > 0
    || acModsFromCons(targetAcConditions).filter(valueNegative).length > 0
  const existConModsNegative = conMods.filter(m => m.modifier < 0).length > 0
    || acModsFromCons(targetAcConditions).filter(valuePositive).length > 0
  const conModsPositiveTotal = conMods.filter(modifierPositive).reduce(sumReducerMods, 0)
    - acModsFromCons(targetAcConditions).filter(valueNegative).reduce(sumReducerAcConditions, 0)
  const conModsNegativeTotal = conMods.filter(modifierNegative).reduce(sumReducerMods, 0)
    - acModsFromCons(targetAcConditions).filter(valuePositive).reduce(sumReducerAcConditions, 0)

  const rollTotal = parseInt(data.content)
  const rollDc = data.flags.pf2e.context.dc.value
  const totalMinusDc = rollTotal - rollDc
  const totalAboveThreshold = ((totalMinusDc % 10) + 10) % 10 // within [0, 9]
  const totalBelowThreshold = ((totalMinusDc % 10) - 10 + 1) % 10 - 1 // within [-10, -1]
  const critSuccess = totalMinusDc >= 10 || data.flags.pf2e.context.outcome === 'criticalSuccess'
  const doubleCritSuccess = totalMinusDc >= 10 && chatMessage.roll.terms[0].results[0] === 20
  const critFail = totalMinusDc < -10 || data.flags.pf2e.context.outcome === 'criticalFailure'
  const doubleCritFail = totalMinusDc < -10 && chatMessage.roll.terms[0].results[0] === 1

  const positiveConditionsChangedOutcome = existConModsPositive && conModsPositiveTotal > totalAboveThreshold && !critFail && !doubleCritSuccess
  const negativeConditionsChangedOutcome = existConModsNegative && conModsNegativeTotal <= totalBelowThreshold && !critSuccess && !doubleCritFail

  const oldFlavor = chatMessage.data.flavor
  let newFlavor = oldFlavor
  conMods.forEach(m => {
    const isNegativeMod = m.modifier < 0
    // return (not marking condition modifier at all) if it was absolutely not necessary
    if ((!isNegativeMod && !positiveConditionsChangedOutcome) || (isNegativeMod && !negativeConditionsChangedOutcome))
      return
    // check if this effect was not necessary by itself to improve/worsen the roll
    const wasNeededToImproveResult = !isNegativeMod && positiveConditionsChangedOutcome
      && conModsPositiveTotal - m.modifier <= totalAboveThreshold
    const wasNeededToWorsenResult = isNegativeMod && negativeConditionsChangedOutcome
      && conModsNegativeTotal - m.modifier > totalBelowThreshold
    const color = isNegativeMod
      ? (wasNeededToWorsenResult ? NEGATIVE_COLOR : WEAK_NEGATIVE_COLOR)
      : (wasNeededToImproveResult ? POSITIVE_COLOR : WEAK_POSITIVE_COLOR)
    const modifierValue = (m.modifier < 0 ? '' : '+') + m.modifier
    const modifierName = game.i18n.localize(m.name)
    newFlavor = newFlavor.replaceAll(
      `<span class="tag tag_alt">${modifierName} ${modifierValue}</span>`,
      `<span class="tag tag_alt" style="background-color: ${color}">${modifierName} ${modifierValue}</span>`
    )
  })
  const acFlavorSuffix = targetAcConditions.map(c => {
    const conditionAcMod = c.data.modifiers.filter(isAcMod).reduce(sumReducerAcConditions, -0)
    const isNegativeMod = conditionAcMod < 0
    // check if this effect was actually not necessary to worsen the roll (but another effect was)
    const wasNeededToImproveResult = isNegativeMod && positiveConditionsChangedOutcome
      && totalAboveThreshold + conditionAcMod < 0
    const wasNeededToWorsenResult = !isNegativeMod && negativeConditionsChangedOutcome
      && totalBelowThreshold + conditionAcMod >= 0
    if ((isNegativeMod && !positiveConditionsChangedOutcome) || (!isNegativeMod && !negativeConditionsChangedOutcome))
      return
    const color = isNegativeMod
      ? (wasNeededToImproveResult ? POSITIVE_COLOR : WEAK_POSITIVE_COLOR)
      : (wasNeededToWorsenResult ? NEGATIVE_COLOR : WEAK_NEGATIVE_COLOR)
    const modifierValue = (isNegativeMod ? '' : '+') + conditionAcMod
    const modifierName = c.name
    return `<span style="color: ${color}">${modifierName} ${modifierValue}</span>`
  }).filter(s => s !== undefined)
    .join(', ')
  if (acFlavorSuffix) {
    if (getSetting('show-defense-highlights-to-everyone'))
      // placed below GM-only visibility area
      newFlavor = newFlavor.replaceAll(
        `</b></div><div data-visibility="all"`,
        `</b></div><div><b>(${acFlavorSuffix})</b></div><div data-visibility="all"`
      )
    else
      // placed inside GM-only visibility area
      newFlavor = newFlavor.replaceAll(
        `</b></div><div data-visibility="all"`,
        ` (${acFlavorSuffix})</b></div><div data-visibility="all"`
      )
  }

  if (newFlavor !== oldFlavor) {
    data.flavor = newFlavor
    await chatMessage.data.update({ 'flavor': newFlavor })
  }
  return true
}

const getSetting = (settingName) => game.settings.get(MODULE_ID, settingName)

Hooks.on('init', function () {
  game.settings.register(MODULE_ID, 'module-enabled', {
    name: 'Enable module',
    hint: 'Highlight situations when status effects (buffs, debuffs, conditions) change the outcome of a roll.',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
  })
  game.settings.register(MODULE_ID, 'show-defense-highlights-to-everyone', {
    name: 'Show defense highlights to everyone',
    hint: 'If set to true, defense highlights such as "Flat-footed -2" will be shown to everyone, not just GM.',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
  })
})

Hooks.once('setup', function () {
  Hooks.on('preCreateChatMessage', hook_preCreateChatMessage)
  console.log(`${MODULE_ID} | initialized`)
})
