import { MODULE_ID } from './pf2emm-types.mjs'

let warnedAboutLocalization = false

/**
 * @param {string} key
 * @param {string} defaultValue
 * @returns {string}
 */
export const tryLocalize = (key, defaultValue) => {
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

export const i18n = (keyInModule) => game.i18n.localize(`${MODULE_ID}.${keyInModule}`)

/** @param {string} settingName */
export const getSetting = (settingName) => game.settings.get(MODULE_ID, settingName)


