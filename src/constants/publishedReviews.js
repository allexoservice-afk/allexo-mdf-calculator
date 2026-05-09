/**
 * Published customer reviews (consent given for website).
 * @typedef {{ id: string, author: string, location: string, text: Record<string, string> }} PublishedReview
 */

/** @type {PublishedReview[]} */
export const PUBLISHED_REVIEWS = [
  {
    id: 'liudmyla-koen-2026',
    author: 'Liudmyla-Koen',
    location: 'Zwalm, Vlaamse Ardennen',
    text: {
      uk: 'Гарна робота, акуратно, відповідально, професійно! Щиро дякую!',
      nl: 'Goed gedaan, netjes, verantwoordelijk en professioneel. Heel erg bedankt!',
      en: 'Great work — neat, responsible, and professional. Thank you very much!',
      fr: 'Beau travail, soigné, responsable et professionnel. Merci beaucoup !',
    },
  },
]
