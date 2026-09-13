/**
 * Pro-only partner showcase (Tverdi oak doors & windowsills).
 * Product copy sourced from partner shop product pages (EN).
 * Images hotlinked from partner shop for draft; replace with local assets before public launch.
 * Toggle `CATALOG_PUBLIC` to true when ready for all visitors.
 */

export const CATALOG_PUBLIC = false

export const PARTNER_SHOP_ORIGIN = 'https://shop.tverdihoutenproducten.be'

/** @typedef {'doors' | 'windowsills'} CatalogCategoryId */
/** @typedef {'model' | 'leaf' | 'accessory'} CatalogProductKind */

/**
 * @typedef {{
 *   heightCm: string
 *   widthsCm: string
 * }} CatalogSizeRow
 *
 * @typedef {{
 *   label: string
 *   value: string
 * }} CatalogSpec
 *
 * @typedef {{
 *   id: string
 *   category: CatalogCategoryId
 *   kind: CatalogProductKind
 *   name: string
 *   priceFrom: number | null
 *   image: string
 *   partnerUrl: string
 *   sizeHint?: string
 *   note?: string
 *   description?: string
 *   bullets?: string[]
 *   specs?: CatalogSpec[]
 *   sizes?: CatalogSizeRow[]
 *   stockSizes?: string[]
 * }} CatalogProduct
 */

/** @type {CatalogProduct[]} */
export const CATALOG_PRODUCTS = [
  {
    id: "door-aurora",
    category: "doors",
    kind: "model",
    name: "Aurora",
    priceFrom: 850,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.product/22734/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/aurora-152`,
    sizeHint: "40×800×2000",
    note: "The price is exclusive of hardware. Add the necessary parts in the category “Door hardware”.",
    description: "Our oak products are manufactured according to wood grades A, B, and C, where natural characteristics of oak are allowed depending on the quality of the surface.",
    specs: [{"label": "Quality A", "value": "A few healthy knots up to 10 mm, minor black pin knots up to 3 mm, and a consistent wood tone."}, {"label": "Quality B", "value": "Healthy knots up to 35 mm, black knots and holes up to 10 mm, sapwood up to 5 mm, natural color and structure variations of the wood are allowed, repair of dead knots is allowed."}, {"label": "Quality C", "value": "Healthy knots up to 90 mm, dark sound knots up to 60 mm, natural color variation, and sapwood up to 20 mm."}, {"label": "Repair of defects", "value": "Repairs are permitted using wood filler or knot plugs. Dead or loose knots are repaired exclusively with knot plugs; cracks are professionally filled with wood filler."}],
    sizes: [{"heightCm": "201.5", "widthsCm": "63 / 68 / 73 / 78 / 83 / 88 / 93"}, {"heightCm": "211.5", "widthsCm": "73 / 78 / 83 / 88 / 93"}, {"heightCm": "231.5", "widthsCm": "83 / 88 / 93"}],
  },
  {
    id: "door-randevu",
    category: "doors",
    kind: "model",
    name: "Randevu",
    priceFrom: 850,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/153/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/randevu-153`,
    sizeHint: "40×800×2000",
    note: "The price is exclusive of hardware. Add the necessary parts in the category “Door hardware”.",
    description: "Our oak products are manufactured according to wood grades A, B, and C, allowing for natural characteristics of oak depending on the quality of the surface.",
    specs: [{"label": "Quality A", "value": "A few healthy knots up to 10 mm, minor black pin knots up to 3 mm, and a consistent wood tone."}, {"label": "Quality B", "value": "Healthy knots up to 35 mm, black knots and holes up to 10 mm, sapwood up to 5 mm, natural color and structure variations of the wood are allowed, repair of dead knots is allowed."}, {"label": "Quality C", "value": "Healthy knots up to 90 mm, dark sound knots up to 60 mm, natural color variation, and sapwood up to 20 mm."}, {"label": "Repair of defects", "value": "Repairs are permitted using wood filler or knot plugs. Dead or loose knots are repaired exclusively with knot plugs; cracks are professionally filled with wood filler."}],
    sizes: [{"heightCm": "201.5", "widthsCm": "63 / 68 / 73 / 78 / 83 / 88 / 93"}, {"heightCm": "211.5", "widthsCm": "73 / 78 / 83 / 88 / 93"}, {"heightCm": "231.5", "widthsCm": "83 / 88 / 93"}],
  },
  {
    id: "door-elegance",
    category: "doors",
    kind: "model",
    name: "Elegance",
    priceFrom: 850,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/155/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/elegance-155`,
    sizeHint: "40×800×2000",
    note: "The price is exclusive of hardware. Add the necessary parts in the category “Door Hardware”.",
    description: "Our oak products are manufactured according to wood grades A, B, and C, where natural characteristics of oak wood are allowed depending on the quality of the surface.",
    specs: [{"label": "Quality A", "value": "A few healthy knots up to 10 mm, minor black pin knots up to 3 mm, and a consistent wood tone."}, {"label": "Quality B", "value": "Healthy knots up to 35 mm, black knots and holes up to 10 mm, sapwood up to 5 mm, natural color and structure variations of the wood are allowed, repair of dead knots is allowed."}, {"label": "Quality C", "value": "Healthy knots up to 90 mm, dark sound knots up to 60 mm, natural color variation, and sapwood up to 20 mm."}, {"label": "Repair of defects", "value": "Repairs are permitted using wood filler or knot plugs. Dead or loose knots are repaired exclusively with knot plugs; cracks are professionally filled with wood filler."}],
    sizes: [{"heightCm": "201.5", "widthsCm": "63 / 68 / 73 / 78 / 83 / 88 / 93"}, {"heightCm": "211.5", "widthsCm": "73 / 78 / 83 / 88 / 93"}, {"heightCm": "231.5", "widthsCm": "83 / 88 / 93"}],
  },
  {
    id: "door-country",
    category: "doors",
    kind: "model",
    name: "Country",
    priceFrom: 850,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/157/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/country-157`,
    sizeHint: "40×800×2000",
    note: "The price is exclusive of hardware. Add the necessary parts in the category “Door hardware”.",
    description: "Our oak products are manufactured according to wood grades A, B, and C, where natural characteristics of oak wood are allowed depending on the quality of the surface.",
    specs: [{"label": "Quality A", "value": "A few healthy knots up to 10 mm, minor black pin knots up to 3 mm, and a consistent wood tone."}, {"label": "Quality B", "value": "Healthy knots up to 35 mm, black knots and holes up to 10 mm, sapwood up to 5 mm, natural color and structure variations of the wood are allowed, repair of dead knots is allowed."}, {"label": "Quality C", "value": "Healthy knots up to 90 mm, dark sound knots up to 60 mm, natural color variation, and sapwood up to 20 mm."}, {"label": "Repair of defects", "value": "Repairs are permitted using wood filler or knot plugs. Dead or loose knots are repaired exclusively with knot plugs; cracks are professionally filled with wood filler."}],
    sizes: [{"heightCm": "201.5", "widthsCm": "63 / 68 / 73 / 78 / 83 / 88 / 93"}, {"heightCm": "211.5", "widthsCm": "73 / 78 / 83 / 88 / 93"}, {"heightCm": "231.5", "widthsCm": "83 / 88 / 93"}],
  },
  {
    id: "door-wortel",
    category: "doors",
    kind: "model",
    name: "Wortel",
    priceFrom: 850,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/232/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/wortel-232`,
    note: "The price is exclusive of hardware. Add the necessary parts in the category “Door hardware”.",
    description: "Our oak products are manufactured according to wood grades A, B, and C, where natural characteristics of oak are allowed depending on the quality of the surface.",
    specs: [{"label": "Quality A", "value": "A few healthy knots up to 10 mm, minor black pin knots up to 3 mm, and a consistent wood tone."}, {"label": "Quality B", "value": "Healthy knots up to 35 mm, black knots and holes up to 10 mm, sapwood up to 5 mm, natural color and structure variations of the wood are allowed, repair of dead knots is allowed."}, {"label": "Quality C", "value": "Healthy knots up to 90 mm, dark sound knots up to 60 mm, natural color variation, and sapwood up to 20 mm."}, {"label": "Repair of defects", "value": "Repairs are permitted using wood filler or knot plugs. Dead or loose knots are repaired exclusively with knot plugs; cracks are professionally filled with wood filler."}],
    sizes: [{"heightCm": "201.5", "widthsCm": "63 / 68 / 73 / 78 / 83 / 88 / 93"}, {"heightCm": "211.5", "widthsCm": "73 / 78 / 83 / 88 / 93"}, {"heightCm": "231.5", "widthsCm": "83 / 88 / 93"}],
  },
  {
    id: "door-kernen",
    category: "doors",
    kind: "model",
    name: "Kernen",
    priceFrom: 850,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/233/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/kernen-233`,
    note: "The price is exclusive of hardware. Add the necessary parts in the category “Door hardware”.",
    description: "Our oak products are manufactured according to wood grades A, B, and C, where natural characteristics of oak are allowed depending on the quality of the surface.",
    specs: [{"label": "Quality A", "value": "A few healthy knots up to 10 mm, minor black pin knots up to 3 mm, and a consistent wood tone."}, {"label": "Quality B", "value": "Healthy knots up to 35 mm, black knots and holes up to 10 mm, sapwood up to 5 mm, natural color and structure variations of the wood are allowed, repair of dead knots is allowed."}, {"label": "Quality C", "value": "Healthy knots up to 90 mm, dark sound knots up to 60 mm, natural color variation, and sapwood up to 20 mm."}, {"label": "Repair of defects", "value": "Repairs are permitted using wood filler or knot plugs. Dead or loose knots are repaired exclusively with knot plugs; cracks are professionally filled with wood filler."}],
    sizes: [{"heightCm": "201.5", "widthsCm": "63 / 68 / 73 / 78 / 83 / 88 / 93"}, {"heightCm": "211.5", "widthsCm": "73 / 78 / 83 / 88 / 93"}, {"heightCm": "231.5", "widthsCm": "83 / 88 / 93"}],
  },
  {
    id: "door-composite-leaf",
    category: "doors",
    kind: "leaf",
    name: "Composite single door leaf",
    priceFrom: 693,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/2975/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/composite-single-door-leaf-2975`,
    description: "Our oak products are manufactured according to wood grades A, B, and C, where natural properties of oak wood are allowed depending on the quality of the surface.",
    specs: [{"label": "Quality A", "value": "some healthy knots up to 10 mm, some black nail knots up to 3 mm, uniform wood color."}, {"label": "Quality B", "value": "healthy knots up to 35 mm, black knots and holes up to 10 mm, sapwood up to 5 mm, natural color and structure variations of the wood are allowed, repair of dead knots is allowed."}, {"label": "Quality C", "value": "healthy knots up to 90 mm, dark solid knots up to 60 mm, natural color variations, sapwood up to 20 mm."}, {"label": "Repair of defects", "value": "repair is allowed with wood filler or insert knots. Dead, falling knots are repaired exclusively with insert knots; cracks are repaired with wood filler (color to be agreed upon)."}],
    sizes: [{"heightCm": "201.5", "widthsCm": "63 / 68 / 73 / 78 / 83 / 88 / 93"}, {"heightCm": "211.5", "widthsCm": "73 / 78 / 83 / 88 / 93"}, {"heightCm": "231.5", "widthsCm": "83 / 88 / 93"}],
  },
  {
    id: "door-flush-leaf",
    category: "doors",
    kind: "leaf",
    name: "Flush door leaf",
    priceFrom: 693,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/2980/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/flush-door-leaf-2980`,
  },
  {
    id: "door-frame",
    category: "doors",
    kind: "accessory",
    name: "Door frame",
    priceFrom: 35.4,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/2978/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/door-frame-2978`,
    note: "Prijs per lopende meter.",
    bullets: [
      "48 mm × 90 mm × lengte op maat gemaakt — door frame",
      "48 mm × 90 mm × lengte op maat gemaakt — coplanar door frame",
      "38 mm × 90 mm × lengte op maat gemaakt — inside door frame",
    ],
  },
  {
    id: "door-frame-ext",
    category: "doors",
    kind: "accessory",
    name: "Door frame extension",
    priceFrom: 17.94,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/2976/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/door-frame-extension-2976`,
    note: "Price per set.",
  },
  {
    id: "door-moulding",
    category: "doors",
    kind: "accessory",
    name: "Oak door moulding",
    priceFrom: 9.44,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.template/2977/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/doors-3/oak-door-moulding-2977`,
    note: "Price per linear meter.",
    bullets: ["Dimensions: 30 mm × 70 mm × length custom made."],
  },
  {
    id: "sill-terra",
    category: "windowsills",
    kind: "model",
    name: "TERRA",
    priceFrom: 52,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.product/193/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/windowsills-12/terra-59`,
    sizeHint: "vanaf 20×290×1000",
    description: "The Terra windowsill brings a warm, organic atmosphere to your home. The edges are naturally softened, following the authentic, gently undulating lines of the wood. This creates a unique and timeless element that brings the pure beauty of nature directly into your interior.",
    specs: [{"label": "Wood type", "value": "100% solid oak with a unique and unrepeatable natural structure."}, {"label": "Feature", "value": "A subtly wavy edge (live edge) that follows the natural shape of the tree, combined with softly rounded corners for a refined look."}, {"label": "Finish", "value": "Available in natural oak color or with a professional color coating of your choice."}, {"label": "Surface", "value": "Smoothly sanded and splinter-free, making the organic shapes of the edge feel pleasant."}, {"label": "Appearance", "value": "Elegant and authentic, emphasizing the vibrant character of solid oak wood."}],
    stockSizes: ["20×290×1000", "20×290×1200", "20×290×1500", "20×290×2000", "20×290×2500", "20×290×2920", "20×400×1000", "20×400×1200", "20×400×1500", "20×400×2000", "20×400×2500", "20×400×2920"],
  },
  {
    id: "sill-flow",
    category: "windowsills",
    kind: "model",
    name: "FLOW",
    priceFrom: 52,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.product/190/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/windowsills-12/flow-143`,
    sizeHint: "vanaf 20×290×1000",
    description: "The Flow windowsill embodies grace through its continuous, liquid lines. With its deep-tapered and softly rounded edges, it eliminates harsh angles to create a smooth, 'infinite' look. This design radiates a sense of calm, making it a safe and sophisticated choice for modern family interiors.",
    specs: [{"label": "Wood type", "value": "100% solid oak with a unique and unrepeatable natural structure."}, {"label": "Feature", "value": "A deeply rounded, flowing edge finish that ensures a soft transition and a harmonious overall appearance."}, {"label": "Finish", "value": "Available in natural oak color or with a professional color coating of your choice."}, {"label": "Surface", "value": "Smoothly sanded and splinter-free, which further emphasizes the soft contours of the wood."}, {"label": "Safety", "value": "The absence of sharp corners makes this model particularly suitable for a child-friendly and comfortable interior."}],
    stockSizes: ["20×290×1000", "20×290×1200", "20×290×1500", "20×290×2000", "20×290×2500", "20×290×2920", "20×400×1000", "20×400×1200", "20×400×1500", "20×400×2000", "20×400×2500", "20×400×2920"],
  },
  {
    id: "sill-facet",
    category: "windowsills",
    kind: "model",
    name: "FACET",
    priceFrom: 52,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.product/189/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/windowsills-12/facet-144`,
    sizeHint: "vanaf 20×290×1000",
    description: "The Facet windowsill is distinguished by its sleek, geometric finish. The subtly beveled edges give the solid oak a modern and refined character. This model is the perfect choice for those who appreciate minimalist design with sharp, clear lines.",
    specs: [{"label": "Wood type", "value": "100% solid oak with a unique and unrepeatable natural structure."}, {"label": "Feature", "value": "Straight, beveled edges (facet) for an architectural and modern appearance."}, {"label": "Surface", "value": "Smoothly sanded and splinter-free, making the windowsill pleasant to touch."}, {"label": "Finish", "value": "Available in natural oak color or with a professional color coating of your choice."}, {"label": "Durability", "value": "The sturdy construction withstands daily use and the placement of decorative objects."}],
    stockSizes: ["20×290×1000", "20×290×1200", "20×290×1500", "20×290×2000", "20×290×2500", "20×290×2920", "20×400×1000", "20×400×1200", "20×400×1500", "20×400×2000", "20×400×2500", "20×400×2920"],
  },
  {
    id: "sill-nord",
    category: "windowsills",
    kind: "model",
    name: "NORD",
    priceFrom: 52,
    image: `${PARTNER_SHOP_ORIGIN}/web/image/product.product/187/image_512`,
    partnerUrl: `${PARTNER_SHOP_ORIGIN}/en/shop/windowsills-12/nord-145`,
    sizeHint: "vanaf 20×290×1000",
    description: "The Nord windowsill embodies the essence of modern design: simplicity, strength, and natural beauty. With its clean, square edges and robust appearance, this model fits perfectly in a contemporary or industrial interior where the pure and raw character of the oak takes center stage.",
    specs: [{"label": "Wood type", "value": "100% solid oak with a unique and unrepeatable natural structure."}, {"label": "Feature", "value": "Clean, straight edges that create a rugged and solid effect in the space."}, {"label": "Finish", "value": "Available in natural oak color or with a professional color coating of your choice."}, {"label": "Style", "value": "Timeless and minimalist, emphasizing honest materials and sleek design."}, {"label": "Surface", "value": "Smoothly sanded and splinter-free, highlighting the solid quality of the wood."}, {"label": "Durability", "value": "A robust design that lasts for generations and withstands intensive daily use."}],
    stockSizes: ["20×290×1000", "20×290×1200", "20×290×1500", "20×290×2000", "20×290×2500", "20×290×2920", "20×400×1000", "20×400×1200", "20×400×1500", "20×400×2000", "20×400×2500", "20×400×2920"],
  },
]

/** @param {CatalogCategoryId} category */
export function productsForCategory(category) {
  return CATALOG_PRODUCTS.filter((p) => p.category === category)
}

export function canShowCatalog(proActive) {
  return CATALOG_PUBLIC || Boolean(proActive)
}
