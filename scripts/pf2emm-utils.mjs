import { MODULE_ID } from './pf2emm-types.mjs'

export const mocks = {
  fromUuidSync_mock: null,
}

export const i18n = (keyInModule) => game.i18n.localize(`${MODULE_ID}.${keyInModule}`)

/** @param {string} settingName */
export const getSetting = (settingName) => game.settings.get(MODULE_ID, settingName)

export const getDocFromUuidSync = (uuid) => {
  if (mocks.fromUuidSync_mock)
    return mocks.fromUuidSync_mock[uuid] ?? Error(`No mock found for UUID ${uuid}`)
  else
    return fromUuidSync(uuid)
}

