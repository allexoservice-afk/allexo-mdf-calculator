/**
 * Зарезервовано під майбутній модальний popup:
 * «Send to WhatsApp» / «Send by Email».
 * Зараз канали обрані в `GetQuoteLeadPanel.vue`; цей модуль — точка розширення без зміни калькулятора.
 *
 * @typedef {'whatsapp' | 'email'} LeadPopupChannel
 */

export const LEAD_POPUP_CHANNEL = Object.freeze({
  WHATSAPP: /** @type {const} */ ('whatsapp'),
  EMAIL: /** @type {const} */ ('email'),
})

/** @type {null | ((channel: LeadPopupChannel) => void)} */
let _onChannelPicked = null

/**
 * @param {(channel: LeadPopupChannel) => void} handler
 */
export function registerLeadPopupChannelHandler(handler) {
  _onChannelPicked = handler
}

/**
 * TODO: відкрити Vue popup (Teleport) і після вибору викликати `_onChannelPicked?.(channel)`.
 * @returns {void}
 */
export function openLeadChannelPopup() {
  void _onChannelPicked
}
