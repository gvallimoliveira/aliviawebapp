export const AI_CREDIT_PACKAGES: Record<string, {price_id:string;credits:number;price_brl:number;label:string}> = {
 mini:{price_id:"price_1UX7SQ2HgVhVBE8UMYU1IKmh",credits:15,price_brl:39,label:"Pacote IA Mini (15 créditos)"},
 plus:{price_id:"price_1UX7Sd2HgVhVBE8Ulqamz59L",credits:30,price_brl:69,label:"Pacote IA Plus (30 créditos)"},
 pro:{price_id:"price_1UX7Su2HgVhVBE8UCTqLLG6h",credits:60,price_brl:129,label:"Pacote IA Pro (60 créditos)"},
};
// Already-open sessions must still receive exactly what was purchased.
const LEGACY_PACKAGES = {
 mini:{...AI_CREDIT_PACKAGES.mini,price_id:"price_1TxbDh2HgVhVBE8UhMrZcf0l",price_brl:29},
 plus:{...AI_CREDIT_PACKAGES.plus,price_id:"price_1TxbE22HgVhVBE8Ura1ksREZ",price_brl:59},
 pro:{...AI_CREDIT_PACKAGES.pro,price_id:"price_1TxbEQ2HgVhVBE8UYUA34mfm",price_brl:89},
};
export function paidCreditPackage(key:string,priceId:string|undefined,amount:number|null) {
 const legacy = LEGACY_PACKAGES[key as keyof typeof LEGACY_PACKAGES];
 return [AI_CREDIT_PACKAGES[key],legacy].find(p=>p && p.price_id===priceId && p.price_brl*100===amount);
}
export function safeCreditReturnOrigin(candidate:string):string {
 try {
  const u=new URL(candidate);
  if (u.protocol==='https:' && (['aliviawebapp.com.br','aliviawebapp.lovable.app'].includes(u.hostname) || /^id-preview--[a-z0-9-]+\.lovable\.app$/.test(u.hostname))) return u.origin;
  if (u.origin==='http://localhost:8080') return u.origin;
 } catch { /* use canonical app */ }
 return 'https://aliviawebapp.com.br';
}
