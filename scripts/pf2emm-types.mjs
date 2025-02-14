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
 * @property {'None'} significance
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