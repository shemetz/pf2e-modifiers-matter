import { MODULE_ID } from './pf2emm-types.mjs'

export const i18n = (keyInModule) => game.i18n.localize(`${MODULE_ID}.${keyInModule}`)

/** @param {string} settingName */
export const getSetting = (settingName) => game.settings.get(MODULE_ID, settingName)


