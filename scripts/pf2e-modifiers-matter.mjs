import { DEGREES, MODULE_ID, SIGNIFICANCE } from './pf2emm-types.mjs'
import { getDocFromUuidSync, getSetting, i18n } from './pf2emm-utils.mjs'
import { calcDegreePlusRoll, calcSignificantModifiers, checkHighlightPotentials } from './pf2emm-logic.mjs'

// TODO - currently impossible, but in the future may be possible to react to effects that change embedded DCs in Note rule elements.
// See:  https://github.com/foundryvtt/pf2e/issues/16537
// for example, the Monk's Stunning Fist uses a Class DC but this module won't recognize modifiers to that DC in this situation.

// Helpful for testing - replace random dice roller with 1,2,3,4....19,20 by putting this in the console:
/*
NEXT_RND_ROLLS_D20 = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
rndIndex = -1
CONFIG.Dice.randomUniform = () => {rndIndex = (rndIndex + 1) % NEXT_RND_ROLLS_D20.length; return 1.02 - NEXT_RND_ROLLS_D20[rndIndex] / 20}
 */
// also helpful:  create an Effect with some level, and this rule element:  {"key":"SubstituteRoll","selector":"all","value":"@item.level","required":true}

const IGNORED_MODIFIER_SLUGS = new Set([
  // basic
  'base', // this accounts for a lot of ignored things, included weak/elite
  'multiple-attack-penalty',
  'proficiency',
  // ability scores
  'str',
  'con',
  'dex',
  'int',
  'wis',
  'cha',
  // fundamental runes
  'weapon-potency',
  'armor-potency',
  'resilient',
  'greaterResilient',
  'majorResilient',
  'mythicResilient',
  'striking',
  'greaterStriking',
  'majorStriking',
  'mythicStriking',
  // also for sf2e... just future-proofing
  'commercial',
  'tactical',
  'advanced',
  'superior',
  'elite',
  'ultimate',
  'paragon',
  'commercial',
  'tactical',
  'advanced',
  'superior',
  'elite',
  'ultimate',
  'paragon',
  // Automatic Bonus Progression
  'save-potency',
  'defense-potency',
  'perception-potency',
  'attack-potency',
  // Misc common
  'bulwark', // armor trait
  'armor-check-penalty',
  'level-bump', // for some PFS thing
  'variant', // when using a skill check with a different skill
  'battle-form',
  'item-bonus', // Included in all bombs, in the "Bonus attack" field.  label is just "Item Bonus"

  // Misc specific
  'double-shot', // Double shot makes attacks at -2 and -4, just like MAP it should be ignored
  'stylish-combatant', // Swashbuckler class feature, bonus is permanent
  'simple-firearms-crossbows', // Gunslinger class features
  'martial-firearms-crossbows', // same
  'advanced-firearms-crossbows', // same
  'doubling-rings', // these can function as a fundamental rune with a different source
  'doubling-rings-greater', // same

  // commonly found on fiends
  // but also commonly *incorrectly* used as a slug for e.g. "+2 to Will Saves vs Emotion"
  '1-status-to-all-saves-vs-magic',
  // Assorted monster abilities which seem permanent and thus not useful to highlight
  'cryptid-experimental-augmented',
  'kallas-devil-blameless',
  'mana-wastes-mutant-hulking-form',
  'skeleton-lacquered',

  // yes I'm gonna add my houserules to my module, you can't stop me.
  // https://discord.com/channels/880968862240239708/880969943724728391/1082678343234760704
  'spell-attack-houserule',
  'hr-spell-potency',
  'hr-spell-attack-progression',
  'hr-spell-attack-prof-potency-for-arp',
])
const IGNORED_MODIFIER_SLUGS_FOR_AC_ONLY = new Set([
  // effect that replaces your AC item bonus and dex cap - super hard to calculate its "true" bonus so I just ignore.
  // however, this effect also has other modifiers which I don't want to ignore.
  `drakeheart-mutagen`,
])
const IGNORED_MODIFIER_LABELS_HARDCODED = [
  // compatibility with pf2e-flatten, which adds modifiers to match the PWoL variants.
  // https://github.com/League-of-Foundry-Developers/pf2e-flatten/blob/main/bundle.js#L33
  'Proficiency Without Level',
  `1/2 Level Proficiency`,
  `Half level proficiency`,
  `No level proficiency`,

  // compatibility with Mercenary Marketplace Vol 1, which adds templates that permanently adjust creature stats:
  // Human ancestry templates
  'Ancestral Strength',
  'Ancestral Dexterity',
  'Ancestral Constitution',
  'Ancestral Intelligence',
  'Ancestral Wisdom',
  'Ancestral Charisma',
  // Other ancestry templates (dwarf, elf, etc)
  'Dwarven Constitution',
  'Dwarven Wisdom',
  'Dwarven Charisma',
  'Elven Dexterity',
  'Elven Constitution',
  'Elven Intelligence',
  'Gnomish Strength',
  'Gnomish Constitution',
  'Gnomish Charisma',
  'Goblin Dexterity',
  'Goblin Wisdom',
  'Goblin Charisma',
  'Keen Eyes (Seek hidden or undetected within 30 feet)', // from halfling template
  'Halfling Strength',
  'Halfling Dexterity',
  'Halfling Wisdom',
  'Orcish Strength',
  // Crew templates
  'Crew Level Adjustment',
  'Crew Skill Adjustment',
  // Descriptive Templates
  'Boastful Template',
  'Brutish Template',
  'Oblivious Template',
  'Oblivious Template (Circumstance)',
  'Slight Template',
  'Watchful Template',
  'Convalescent Template (Base)',
  'Convalescent Template (Circumstance Penalty)',
  'Feeble Template (Base)',
  'Feeble Template (Strength Based)',
  'Feeble Template (AC)',
  'Inept Template (Base)',
  'Unlucky Template (Base)',
  'Unlucky Template (AC)',
  'Clumsy Template (Base)',
  'Clumsy Template (Reflex)',
  'Clumsy Template (AC)',
  'Clumsy Template (Dexterity Attacks)',
  'Foolish Template (Base)',
  'Foolish Template (AC)',
  'Foolish Template (Wisdom Based)',
  'Foolish Template (Intelligence Based)',
  'Foolish vs. illusion effects',
  'Frail Template (Base)',
  'Frail Template (Constitution Based)',
  'Frail Template (AC)',
  'Frail Template (Circumstance Penalty)',
  'Punchable Template (Base)',
  'Bold Template (Base)',
  'Bold Template (Will)',
  'Cunning Template (Base)',
  'Cunning Template (Perception)',
  'Cunning Template (Skills)',
  'Hardy Template (Base)',
  'Hardy Template (Fortitude)',
  'Lucky Template (Base)',
  'Protective Template (Base)',
  'Protective Template (AC)',
  'Sorcerous Template (Base)',
  'Doddering Template (Base)',

  // Other adjustments are not in the pf2e system (yet?), but undead adjustments do appear in PF2e Workbench, and one of them is relevant:
  'Ghoul Adjustment',
]
let IGNORED_MODIFIER_LABELS = new Set([
  ...IGNORED_MODIFIER_LABELS_HARDCODED,
])

/**
 * These lists of ignored modifiers are hardcoded (with optional user extension via settings).  The goal is to
 * use them to exclude modifiers that aren't "useful" to highlight, which is decided to be:
 * - If they're permanent passive bonuses that are part of the character build (decided long ago)
 *   - e.g. ability modifier, skill proficiency, fundamental item/potency bonuses, Elite/Weak, templates for NPCs
 * - If they're static numbers that replace your normal passive bonuses (those numbers are usually very high rather than
 * capturing only the "diff", so, there's no easy way to highlight when the choice to use them is significant)
 *   - e.g. old Devise a Stratagem, Battle Forms
 *   - NOTE - they almost all use the 'base' slug nowadays so this is no longer a separate category
 * - If they're so common that you don't care about them or couldn't help but apply them
 *   - e.g. multiple attack penalty, including e.g. Hunter's Edge: Flurry
 */
const initializeIgnoredModifiers = () => {
  IGNORED_MODIFIER_LABELS = new Set([
    ...IGNORED_MODIFIER_LABELS_HARDCODED,
    ...getSetting('additional-ignored-labels').split(';'),
  ])
}

/** @return {Modifier} */
const getOffGuardAcMod = () => {
  const offGuardSlug = 'off-guard'
  const systemOffGuardCondition = game.pf2e.ConditionManager.getCondition(offGuardSlug)
  return {
    label: systemOffGuardCondition.name,
    modifier: -2,
    type: 'circumstance',
    slug: offGuardSlug,
    enabled: true,
    ignored: false,
  }
}

/**
 * @param {Modifier[]} allModifiersInChatMessage
 * @returns {Modifier[]}
 */
export const filterOutIgnoredModifiers = (allModifiersInChatMessage) => {
  return allModifiersInChatMessage
    // enabled is false for one of the conditions if it can't stack with others
    .filter(m => m.enabled && !m.ignored)
    // ignore everything from the hardcoded lists, plus user-defined labels
    .filter(m => !IGNORED_MODIFIER_SLUGS.has(m.slug))
    .filter(m => !IGNORED_MODIFIER_LABELS.has(m.label))
    // for attacks, ignore all "form" spells that replace your attack bonus (e.g. Animal Form, Aerial Form)
    .filter(m => !(m.slug.endsWith('-form') && m.type === 'untyped' && m.modifier >= 5))
    // ignore ALL item bonuses from non-effect sources
    .filter(m => {
      if (m.type !== 'item') return true
      if (!m.source) return true
      const item = getDocFromUuidSync(m.source)
      if (!item) return true
      if (item.type === 'effect') return true
      // it's a piece of equipment or a feat, probably, so it's permanent and not interesting to highlight
      return false
    })
}

/**
 * dcFlavorSuffix will be e.g. 'Off-Guard -2, Frightened -1'
 *
 * @param $flavorText
 * @param dcFlavorSuffix
 * @param {'target' | 'caster' | 'actor'} dcActorType
 */
const insertDcFlavorSuffix = ($flavorText, dcFlavorSuffix, dcActorType) => {
  const showHighlightsToEveryone = getSetting('always-show-highlights-to-everyone')
  const dataVisibility = showHighlightsToEveryone ? 'all' : 'gm'
  const messageKey = {
    target: 'Message.TargetHas',
    caster: 'Message.CasterHas',
    actor: 'Message.ActorHas',
  }[dcActorType]
  const targetHasPrefix = i18n(messageKey)
  $flavorText.find('div.degree-of-success').before(
    `<div data-visibility="${dataVisibility}">
${targetHasPrefix} <b>${dcFlavorSuffix}</b>
</div>`)
}

const updateChatLogClass = () => {
  const setting = getSetting('highlight-potentials-preset')
  const $chatLogs = $('section.chat-sidebar')
  $chatLogs.removeClass(`pf2emm_hp_1_status pf2emm_hp_2_status pf2emm_hp_2_circumstance_ac`)
  if (setting !== 'disabled')
    $chatLogs.addClass(`pf2emm_hp_${setting}`)
}

const insertHighlightPotentials = ($flavorText, highlightPotentials) => {
  const classes = [
    highlightPotentials.plus1StatusHasPotential ? 'has_potential_1_status' : '',
    highlightPotentials.plus2StatusHasPotential ? 'has_potential_2_status' : '',
    highlightPotentials.plus2CircumstanceAcHasPotential ? 'has_potential_2_circumstance_ac' : '',
  ].filter(c => c !== '')
  if (classes.length === 0) return
  const text = i18n('Message.HasPotential')
  $flavorText.find('div.degree-of-success').append(
    `<span class="pf2emm-potential ${classes.join(' ')}">${text}</span>`,
  )
}

const parsePf2eChatMessageWithRoll = (chatMessage) => {
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
  const targetedToken = targetedTokenUuid ? getDocFromUuidSync(targetedTokenUuid) : undefined
  // targetedActorUuid will return the TOKEN uuid if it's an unlinked token!  so, we're probably going to ignore it
  const targetedActor = targetedToken?.actor ? targetedToken.actor
    : targetedActorUuid ? getDocFromUuidSync(targetedActorUuid)
      : undefined
  const originUuid = chatMessage.flags.pf2e.origin?.uuid
  const originItem = originUuid ? getDocFromUuidSync(originUuid) : undefined
  const allModifiersInChatMessage = chatMessage.flags.pf2e.modifiers
  return {
    /** @type Actor */
    rollingActor,
    /** @type number */
    deltaFromDc,
    /** @type number */
    dieRoll,
    /** @type {Degree} */
    currentDegreeOfSuccess,
    /** @type string */
    dcSlug,
    /** @type boolean */
    isStrike,
    /** @type boolean */
    isSpell,
    /** @type {Token | undefined} */
    targetedToken,
    /** @type {Actor | undefined} */
    targetedActor,
    /** @type {Item | undefined} */
    originItem,
    /** @type {Modifier[]} */
    allModifiersInChatMessage,
  }
}

/**
 * @param {Token | undefined} targetedActor
 * @param {Item | undefined} originItem
 * @param {string} dcSlug
 * @param {boolean} isStrike
 * @param {boolean} isSpell
 * @param {string[]} contextOptionsInFlags (used to check for target:condition:off-guard option, "ephemeral" off-guard)
 * @param {string} chatMessageFlavor (used only in the "ephemeral" off-guard edge case)
 * @returns {{dcMods: Modifier[], actorWithDc: Actor | undefined}}
 */
const getDcModsAndDcActor = ({
  targetedActor,
  originItem,
  dcSlug,
  isStrike,
  isSpell,
  contextOptionsInFlags,
  chatMessageFlavor,
}) => {
  let dcMods
  let actorWithDc
  if (isStrike && targetedActor) {
    actorWithDc = targetedActor
    const acModifiersExceptArmor = targetedActor.system.attributes.ac.modifiers
      .filter(m => m.slug !== actorWithDc.wornArmor?.slug)
      .filter(m => m.slug !== actorWithDc.wornArmor?.system?.baseItem)
    dcMods = filterOutIgnoredModifiers(acModifiersExceptArmor)
    const offGuardMod = getOffGuardAcMod()
    const isTargetEphemerallyOffGuard = contextOptionsInFlags.includes('target:condition:off-guard')
    if (isTargetEphemerallyOffGuard && !dcMods.some(m => m.label === offGuardMod.label)) {
      const messageFlavorHtml = $(`<div>${chatMessageFlavor}</div>`)
      const dcTooltipsStr = messageFlavorHtml.find('div.target-dc > span > span.adjusted').attr('data-tooltip')
      if (dcTooltipsStr === undefined) {
        // TODO - find when it happens and fix it
        console.error(`${MODULE_ID} | failed to find target DC tooltips in message flavor:`, chatMessageFlavor)
        console.error(`${MODULE_ID} | message flavor as string: ${chatMessageFlavor}`)
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
    dcMods = dcMods.filter(m => !IGNORED_MODIFIER_SLUGS_FOR_AC_ONLY.has(m.slug))
  } else if (isSpell && !!originItem) {
    // (note:  originItem will be undefined in the rare case of a message created through a module like Quick Send To Chat)
    // if saving against spell, DC is the Spellcasting DC which means it's affected by stuff like Frightened and Stupefied
    actorWithDc = originItem.actor
    dcMods = filterOutIgnoredModifiers(originItem.spellcasting.statistic.dc.modifiers)
  } else if (originItem?.category === 'class') {
    // if saving against a class feat/feature, DC is the Class DC which means it's affected by stuff like Frightened and Enfeebled/Drained/etc, depending
    // NOTE:  this will not work for embedded Check buttons that come from Note REs.  see https://github.com/foundryvtt/pf2e/issues/9824
    // TODO - this broke around version 6.3.1, things stop using class feats for class DC;  a solution is needed and it needs to allow for multiclassing too (multiple class DCs)
    actorWithDc = originItem.actor
    dcMods = filterOutIgnoredModifiers(originItem.parent.classDC.modifiers)
  } else if (targetedActor && dcSlug === 'exploit-vulnerability') {
    // Compatibility with the pf2e-thaum-vuln module (for Thaumaturge's "Exploit Vulnerability")
    // The custom action is made using esoteric lore against a standard level-based DC, so there are never DC modifiers
    // see https://github.com/mysurvive/pf2e-thaum-vuln/blob/99ed41038d9051ea906a247a5a6faf1f0a8ed580/src/module/feats/exploit-vulnerability/exploitVulnerability.js#L80
    return {
      dcMods: [],
      actorWithDc: targetedActor,
    }
  } else if (targetedActor && dcSlug) {
    // if there's a target, but it's not an attack, then it's probably a skill check against one of the target's
    // save DCs or perception DC or possibly a skill DC
    actorWithDc = targetedActor
    const dcStatistic = targetedActor.saves[dcSlug] || targetedActor.skills[dcSlug] || targetedActor[dcSlug]
    // dcStatistic should always be defined.  (otherwise it means I didn't account for all cases here!)
    if (dcStatistic === undefined) {
      console.error(
        `${MODULE_ID} | failed to find target DC statistic for dcSlug: ${dcSlug}.  Perhaps it comes from a module's custom action.  Please report this issue!`)
      return {
        dcMods: [],
        actorWithDc: targetedActor,
      }
    }
    dcMods = filterOutIgnoredModifiers(dcStatistic.dc.modifiers)
  } else {
    // happens if e.g. rolling from a @Check style button
    dcMods = []
    actorWithDc = undefined
  }
  return { actorWithDc, dcMods }
}

const updateChatMessageFlavorWithHighlights = async ({
  chatMessage,
  chatMessageData,
  significantRollModifiers,
  significantDcModifiers,
  insignificantDcModifiers,
  highlightPotentials,
  targetedActor,
  isStrike,
  isSpell,
}) => {
  const oldFlavor = chatMessage.flavor
  // adding an artificial div to have a single parent element, enabling nicer editing of html
  const $editedFlavor = $(`<div>${oldFlavor}</div>`)
  // remove old highlights, in case of a reroll within the same message
  $editedFlavor.find('.pf2emm-highlight').removeClass('pf2emm-highlight').removeClass(`pf2emm-is-${SIGNIFICANCE.HARMFUL}`).removeClass(`pf2emm-is-${SIGNIFICANCE.HELPFUL}`).removeClass(`pf2emm-is-${SIGNIFICANCE.ESSENTIAL}`).removeClass(`pf2emm-is-${SIGNIFICANCE.DETRIMENTAL}`)
  const showHighlightsToEveryone = getSetting('always-show-highlights-to-everyone')
  significantRollModifiers.forEach(m => {
    const modVal = m.value
    const modName = m.name
    const modSignificance = m.significance
    const modValStr = (modVal < 0 ? '' : '+') + modVal
    $editedFlavor.find(`span.tag:contains(${modName} ${modValStr})`).addClass('pf2emm-highlight').addClass(`pf2emm-is-${modSignificance}`)
    if (showHighlightsToEveryone)
      $editedFlavor.find(`span.tag:contains(${modName} ${modValStr})`).attr('data-visibility', 'all')
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
  insertHighlightPotentials($editedFlavor, highlightPotentials)
  // newFlavor will be the inner HTML without the artificial div
  const newFlavor = $editedFlavor.html()
  if (newFlavor !== oldFlavor) {
    chatMessageData.flavor = newFlavor // just in case other hooks rely on it
    await chatMessage.updateSource({ 'flavor': newFlavor })
  }
}

/**
 * @param {ChatMessage} chatMessage
 * @param chatMessageData
 * @return {Promise<true>} (always return true, we always want the message to go through)
 */
const hook_preCreateChatMessage = async (chatMessage, chatMessageData) => {
  // continue only if message is a PF2e roll message with a rolling actor
  if (
    !chatMessage.flags
    || !chatMessage.flags.pf2e
    || !chatMessage.flags.pf2e.modifiers
    || !chatMessage.flags.pf2e.context.dc
    || !chatMessage.flags.pf2e.context.actor
  ) return true

  const {
    rollingActor,
    deltaFromDc,
    dieRoll,
    currentDegreeOfSuccess,
    dcSlug,
    isStrike,
    isSpell,
    targetedToken,
    targetedActor,
    originItem,
    allModifiersInChatMessage,
  } = parsePf2eChatMessageWithRoll(chatMessage)

  /*
  NOTE - from this point on, I use the term "modifier" or "mod" to refer to conditions/effects/feats that have granted
  a bonus or penalty to the roll or to the DC the roll was against.  I will filter rollMods and dcMods to only include
  relevant non-ignored modifiers, and then calculate which modifiers actually made a significant impact on the outcome.
   */
  const rollMods = filterOutIgnoredModifiers(allModifiersInChatMessage)

  const { actorWithDc, dcMods } = getDcModsAndDcActor({
    isStrike,
    targetedActor,
    contextOptionsInFlags: chatMessage.flags.pf2e.context.options,
    chatMessageFlavor: chatMessage.flavor,
    isSpell,
    originItem,
    dcSlug,
  })

  const {
    significantRollModifiers,
    significantDcModifiers,
    insignificantDcModifiers,
    highlightPotentials,
  } = calcSignificantModifiers({
    rollMods,
    dcMods,
    originalDeltaFromDc: deltaFromDc,
    dieRoll,
    currentDegreeOfSuccess,
    isStrike,
  })

  await updateChatMessageFlavorWithHighlights({
    chatMessage,
    chatMessageData,
    significantRollModifiers,
    significantDcModifiers,
    insignificantDcModifiers,
    highlightPotentials,
    targetedActor,
    isStrike,
    isSpell,
  })

  // hook call - to allow other modules/macros to trigger based on MM
  const significantModifiers = significantRollModifiers.concat(significantDcModifiers)
  if (significantModifiers.length > 0) {
    Hooks.callAll('modifiersMatter', {
      /** @type {Actor} */
      rollingActor,
      /** @type {Actor | undefined} */
      actorWithDc,
      /** @type {Token | undefined} */
      targetedToken,
      /** @type {SignificantModifier[]} */
      significantModifiers,
      chatMessage,
    })
  }

  return true
}

/**
 * @param {ChatMessage} chatMessage
 * @return {SignificantModifier[]} possibly-empty list of modifiers (to roll or to DC) which mattered
 */
const getSignificantModifiersOfMessage = (chatMessage) => {
  if (
    !chatMessage.flags
    || !chatMessage.flags.pf2e
    || !chatMessage.flags.pf2e.modifiers
    || !chatMessage.flags.pf2e.context.dc
    || !chatMessage.flags.pf2e.context.actor
  ) return []
  const {
    deltaFromDc,
    dieRoll,
    currentDegreeOfSuccess,
    dcSlug,
    isStrike,
    isSpell,
    targetedActor,
    originItem,
    allModifiersInChatMessage,
  } = parsePf2eChatMessageWithRoll(chatMessage)
  const rollMods = filterOutIgnoredModifiers(allModifiersInChatMessage)
  const { dcMods } = getDcModsAndDcActor({
    isStrike,
    targetedActor,
    contextOptionsInFlags: chatMessage.flags.pf2e.context.options,
    chatMessageFlavor: chatMessage.flavor,
    isSpell,
    originItem,
    dcSlug,
  })
  const { significantRollModifiers, significantDcModifiers } = calcSignificantModifiers({
    rollMods,
    dcMods,
    originalDeltaFromDc: deltaFromDc,
    dieRoll,
    currentDegreeOfSuccess,
    isStrike,
  })
  return significantRollModifiers.concat(significantDcModifiers)
}

/**
 *
 * @param {ChatMessage} chatMessage
 * @return {boolean} true if the chat message includes a roll that should have one of its roll/DC modifiers highlighted
 */
const checkIfChatMessageShouldHaveHighlights = (chatMessage) => {
  const significantModifiers = getSignificantModifiersOfMessage(chatMessage)
  return significantModifiers.length > 0
}

//noinspection JSUnusedGlobalSymbols
const exampleHookCourageousAnthem = () => {
  // this hook call is an example!
  // it will play a nice chime sound each time an Inspire Courage effect turns a miss into a hit (or hit to crit)
  Hooks.on('modifiersMatter', ({ rollingActor, significantModifiers }) => {
    console.log(`${rollingActor.name} was helped!`)
    significantModifiers.forEach(({ name, significance }) => {
      if (name.includes('Courageous Anthem') && significance === 'ESSENTIAL') {
        foundry.audio.AudioHelper.play({
          src: 'https://cdn.pixabay.com/audio/2022/01/18/audio_8db1f1b5a5.mp3',
          volume: 1.0,
          autoplay: true,
          loop: false,
        }, true)
      }
    })
  })
}

// this check is only here for the sake of the barebones JS testing I'm doing during development
if (typeof Hooks !== 'undefined') {
  Hooks.on('init', function () {
    game.settings.register(MODULE_ID, 'always-show-highlights-to-everyone', {
      name: `${MODULE_ID}.Settings.always-show-highlights-to-everyone.name`,
      hint: `${MODULE_ID}.Settings.always-show-highlights-to-everyone.hint`,
      scope: 'world',
      config: true,
      default: true,
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
    game.settings.register(MODULE_ID, 'ignore-crit-fail-over-fail-on-attacks', {
      name: `${MODULE_ID}.Settings.ignore-crit-fail-over-fail-on-attacks.name`,
      hint: `${MODULE_ID}.Settings.ignore-crit-fail-over-fail-on-attacks.hint`,
      scope: 'client',
      config: true,
      default: false,
      type: Boolean,
    })
    game.settings.register(MODULE_ID, 'highlight-potentials-preset', {
      name: `${MODULE_ID}.Settings.highlight-potentials-preset.name`,
      hint: `${MODULE_ID}.Settings.highlight-potentials-preset.hint`,
      scope: 'client',
      config: true,
      type: String,
      choices: {
        'disabled': i18n('Settings.highlight-potentials-preset.choices.disabled'),
        '1_status': i18n('Settings.highlight-potentials-preset.choices.1_status'),
        '2_status': i18n('Settings.highlight-potentials-preset.choices.2_status'),
        '2_circumstance_ac': i18n('Settings.highlight-potentials-preset.choices.2_circumstance_ac'),
      },
      default: 'disabled',
      onChange: updateChatLogClass,
    })
  })

  Hooks.once('setup', function () {
    Hooks.on('preCreateChatMessage', hook_preCreateChatMessage)
    initializeIgnoredModifiers()
    console.info(`${MODULE_ID} | initialized`)
  })

  Hooks.on('renderChatLog', updateChatLogClass)

  window.pf2eMm = {
    getSignificantModifiersOfMessage,
    checkIfChatMessageShouldHaveHighlights,
    exampleHookCourageousAnthem,
    DEGREES,
    IGNORED_MODIFIER_LABELS,
    IGNORED_MODIFIER_LABELS_HARDCODED,
    IGNORED_MODIFIER_SLUGS,
    IGNORED_MODIFIER_SLUGS_FOR_AC_ONLY,
    parsePf2eChatMessageWithRoll,
    filterOutIgnoredModifiers,
    getDcModsAndDcActor,
    calcSignificantModifiers,
    checkHighlightPotentials,
    checkPotentialForAmpedGuidance: checkHighlightPotentials, // backwards compatibility until 2025
  }
}
