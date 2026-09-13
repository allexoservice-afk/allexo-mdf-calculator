/**
 * Published customer reviews (consent given for website / public on Google).
 * @typedef {{ id: string, author: string, location: string, text: Record<string, string> }} PublishedReview
 */

/** @type {PublishedReview[]} */
export const PUBLISHED_REVIEWS = [
  {
    id: 'v-dok-google-2026',
    author: 'V Dok',
    location: 'Google',
    text: {
      nl: 'Zeer tevreden over de service van Allexo. Alles werd professioneel en netjes uitgevoerd. Vooraf werden de maten zorgvuldig opgemeten en de ramen werden daarna vakkundig geplaatst en mooi afgewerkt met silicone. De communicatie verliep ook heel goed. Zeker een aanrader! Bedankt voor het goede werk!',
      en: 'Very satisfied with the service from Allexo. Everything was carried out professionally and neatly. The measurements were carefully taken beforehand, and the windows were then expertly installed and beautifully finished with silicone. Communication was also excellent. Highly recommended! Thanks for the good work!',
      uk: 'Дуже задоволені сервісом Allexo. Усе зроблено професійно й акуратно. Спочатку ретельно зняли розміри, потім якісно встановили вікна й гарно засиліконували. Комунікація теж була на висоті. Щиро рекомендуємо! Дякуємо за хорошу роботу!',
      fr: 'Très satisfaits du service d’Allexo. Tout a été réalisé de manière professionnelle et soignée. Les mesures ont d’abord été prises avec soin, puis les fenêtres ont été installées expertement et joliment finies au silicone. La communication était également excellente. Fortement recommandé ! Merci pour le bon travail !',
    },
  },
  {
    id: 'rob-c-google-2026',
    author: 'Rob C',
    location: 'Google',
    text: {
      nl: 'Ik ben enorm tevreden met mijn nieuwe garagepoort!! Oleksandr is ook een enorme vriendelijke kerel, leuk om mee samen te werken.',
      en: 'I am extremely satisfied with my new garage door!! Oleksandr is also a really friendly guy, fun to work with.',
      uk: 'Я надзвичайно задоволений новою гаражною брамою!! Олександр також дуже привітний хлопець, з ним приємно працювати.',
      fr: 'Je suis extrêmement satisfait de ma nouvelle porte de garage !! Oleksandr est aussi un gars vraiment sympathique, agréable à travailler avec.',
    },
  },
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
