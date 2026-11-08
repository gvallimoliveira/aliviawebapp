/** Identity comes from the offer/niche, never from an incidental tool mentioned in a manual. */
import type { BrandDna } from './brandDnaKit';
export const isHospitalityBusiness = (dna?: BrandDna) => /\b(?:hospedagem|airbnb|pousada|hotel|hotelaria|casa de temporada|loca[çc][aã]o.{0,30}temporada|aluguel.{0,30}temporada)\b/i
  .test([dna?.niche, dna?.offer, dna?.presentation, dna?.description].filter(Boolean).join(' '));
export const hospitalityMismatch = (text: string) => /\b(?:software|saas|onboarding|assinante|diagn[oó]stico|paciente|conduta|tratamento|protocolo|primeiro teste|primeiro resultado|resultado final|resultados? mensur[aá]veis|transformar vidas|solu[çc][oõ]es inovadoras|execu[çc][aã]o medida|reavalia[çc][aã]o|checkpoint|entrega sem custo)\b/i.test(text);