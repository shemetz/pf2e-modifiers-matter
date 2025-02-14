export const MODULE_ID = 'pf2e-modifiers-matter'

/**
 * A modifier object (created in the pf2e system code)
 * @typedef {Object} Modifier
 * @property {string} label
 * @property {number} modifier
 * @property {string} type
 * @property {string} slug
 * @property {boolean} enabled
 * @property {boolean} ignored
 */
/**
 * A PF2E Actor object (created in the pf2e system code)
 * @typedef {Object} Actor
 */
/**
 * A PF2E Token object (created in the pf2e system code)
 * @typedef {Object} Token
 */
/**
 * A PF2E Item object (created in the pf2e system code)
 * @typedef {Object} Item
 */
/**
 * @typedef {string} DcType
 */
/**
 * @typedef {'CRIT_SUCC' | 'SUCCESS' | 'FAILURE' | 'CRIT_FAIL'} Degree
 */
/**
 * @typedef {Object} SignificantModifier
 * @property {'roll' | 'dc'} appliedTo
 * @property {string} name - name of the modifier, e.g. "Frightened 1"
 * @property {string} sourceUuid - source UUID of what caused the modifier, usually an item, e.g. "Scene.CwD5P013Aeob7V7q.Token.jwvXVi3CpVoJasYn.Actor.Ue8w2Mo03pCZllrK.Item.OGtvtua5fbS959Lg"
 * @property {number} value
 * @property {'ESSENTIAL' | 'HELPFUL' | 'HARMFUL' | 'DETRIMENTAL'} significance - note: never "None"
 */
/**
 * @typedef {Object} InsignificantModifier
 * @property {'roll' | 'dc'} appliedTo
 * @property {string} name
 * @property {string} sourceUuid
 * @property {number} value
 * @property {'None'}
 */
/**
 * @typedef {Object} ChatMessage - a PF2E Chat Message object.  This definition is incomplete, includes only fields used in this module.
 * @property {Object} flags
 * @property {Object} rolls
 * @property {Object} content
 * @property {Object} flavor
 * @property {Function} updateSource
 */

/**
 * ESSENTIAL (strong green) - This modifier was necessary to achieve this degree of success (DoS).  Others were
 * potentially also necessary.  You should thank the character who caused this modifier!
 *
 * HELPFUL (weak green) - This modifier was not necessary by itself to achieve this DoS, but it was one of many that
 * caused the DoS upgrade, and losing all of them would have been bad.  For example, if you rolled a 14,
 * had +1 & +2, and needed a 15, both the +1 and +2 are marked weak green (helpful) because you needed to have at least
 * one of them, but it didn't matter which one, and you happened to have both at once.
 *
 * NONE - This modifier did not affect the DoS at all, this time.
 *
 * HARMFUL (orange) - Like HELPFUL but in the opposite direction.  Without all the harmful modifiers you had (but
 * not without any one of them), you would've gotten a better DoS.
 *
 * DETRIMENTAL (red) - Like ESSENTIAL but in the opposite direction.  Without this, you would've gotten a better DoS.
 *
 *
 *
 * Note that in case of multiple non-stacking modifiers, PF2e "disables" some of them and hides them from the chat card,
 * so the module won't notice them.  For example, if a monster is both Frightened 1 and Sickened 1 and rolls a -1 miss,
 * you'll probably see Frightened marked as DETRIMENTAL and Sickened not showing up at all, even though the "truth" was
 * that both of them were HARMFUL.
 *
 *
 * Another example:
 *
 * A Giant Opossum  (+10 to hit) is attacking a Goblin Warrior (AC 16).  The opossum is Prone and Enfeebled 1.
 *
 * - If it rolls 9 (total 16), it hits the goblin.  No modifier is significant (so none will be highlighted).
 * - If it rolls 8 (total 15), it misses by -1. Both Prone and Enfeebled 1 are DETRIMENTAL.
 * - If it rolls 7 (total 14), it misses by -2.  Prone is DETRIMENTAL and Enfeebled is not significant.
 * - If it rolls 6 (total 13), it misses by -3.  Both Prone and Enfeebled 1 are HARMFUL.
 * - If it rolls 5 (total 12), it misses by -4.  No modifier is significant.
 *
 * @typedef {'ESSENTIAL' | 'HELPFUL' | 'NONE' | 'HARMFUL' | 'DETRIMENTAL'} Significance
 */
export const SIGNIFICANCE = Object.freeze({
  ESSENTIAL: 'ESSENTIAL',
  HELPFUL: 'HELPFUL',
  NONE: 'NONE',
  HARMFUL: 'HARMFUL',
  DETRIMENTAL: 'DETRIMENTAL',
})
export const DEGREES = Object.freeze({
  CRIT_SUCC: 'CRIT_SUCC',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  CRIT_FAIL: 'CRIT_FAIL',
})