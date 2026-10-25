export const AI_CREDIT_PACKAGES: Record<string, {price_id:string;credits:number;price_brl:number;label:string}> = {
 mini:{price_id:"price_1TxbDh2HgVhVBE8UhMrZcf0l",credits:15,price_brl:29,label:"Pacote IA Mini (15 créditos)"},
 plus:{price_id:"price_1TxbE22HgVhVBE8Ura1ksREZ",credits:30,price_brl:59,label:"Pacote IA Plus (30 créditos)"},
 pro:{price_id:"price_1TxbEQ2HgVhVBE8UYUA34mfm",credits:60,price_brl:89,label:"Pacote IA Pro (60 créditos)"},
};
export function safeCreditReturnOrigin(candidate:string):string {
 try {
  const u=new URL(candidate);
  if (u.protocol==='https:' && (['aliviawebapp.com.br','aliviawebapp.lovable.app'].includes(u.hostname) || /^id-preview--[a-z0-9-]+\.lovable\.app$/.test(u.hostname))) return u.origin;
  if (u.origin==='http://localhost:8080') return u.origin;
 } catch { /* use canonical app */ }
 return 'https://aliviawebapp.com.br';
}
