// Clinic - Até 3 membros
export const CLINIC_SMALL = {
  max_members: 3,
  monthly: {
    price: 197,
    price_formatted: "R$ 197/mês",
    product_id: "prod_UJMAcItKDx7QuT",
    price_id: "price_1TKjS22HgVhVBE8UKPH1p0SR",
  },
  annual: {
    price: 112, // R$1.344/ano ÷ 12
    price_formatted: "R$ 112/mês",
    total: 1344,
    product_id: "prod_UJMAFHGZBjeVu9",
    price_id: "price_1TKjSV2HgVhVBE8UAltRZTlh",
  },
};

// Clinic - 4 a 8 membros
export const CLINIC_MEDIUM = {
  max_members: 8,
  monthly: {
    price: 347,
    price_formatted: "R$ 347/mês",
    product_id: "prod_UJMJdKvyBfm52L",
    price_id: "price_1TKjaS2HgVhVBE8UrpLrMFVU",
  },
  annual: {
    price: 198, // R$2.376/ano ÷ 12
    price_formatted: "R$ 198/mês",
    total: 2376,
    product_id: "prod_UJMJfh6qgMVQXD",
    price_id: "price_1TKjas2HgVhVBE8UtqMAGInP",
  },
};

// Clinic - 9+ membros (ilimitado)
export const CLINIC_LARGE = {
  max_members: 999,
  monthly: {
    price: 497,
    price_formatted: "R$ 497/mês",
    product_id: "prod_UJMJk7jo3AtXwJ",
    price_id: "price_1TKjbC2HgVhVBE8U3ANhCbHs",
  },
  annual: {
    price: 283, // R$3.396/ano ÷ 12
    price_formatted: "R$ 283/mês",
    total: 3396,
    product_id: "prod_UJMKiickrqzXs2",
    price_id: "price_1TKjbT2HgVhVBE8UzG25AfhI",
  },
};

export const CLINIC_TIERS = [CLINIC_SMALL, CLINIC_MEDIUM, CLINIC_LARGE] as const;

// All clinic product IDs for subscription verification
export const CLINIC_PRODUCT_IDS = [
  CLINIC_SMALL.monthly.product_id,
  CLINIC_SMALL.annual.product_id,
  CLINIC_MEDIUM.monthly.product_id,
  CLINIC_MEDIUM.annual.product_id,
  CLINIC_LARGE.monthly.product_id,
  CLINIC_LARGE.annual.product_id,
];
