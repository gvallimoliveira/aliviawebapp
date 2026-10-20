import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
const schema=z.object({batchId:z.string().uuid().optional(),batchIds:z.array(z.string().uuid()).min(1).max(100).optional()}).refine(b=>b.batchId || b.batchIds);
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 try{
  const admin=createClient(Deno.env.get('SUPABASE_URL') ?? '',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const {data:auth,error:authError}=await admin.auth.getUser((req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i,''));
  if(authError || !auth.user)return respond({error:'unauthenticated'},401);
  const parsed=schema.safeParse(await req.json()); if(!parsed.success)return respond({error:'Lotes inválidos.'},400);
  const {data,error}=await admin.rpc('import_undo_batches',{p_batches:parsed.data.batchIds ?? [parsed.data.batchId],p_actor:auth.user.id});
  if(error)return respond({error:error.message==='record_changed_after_import'?'Há registros alterados após a importação. Nada foi desfeito para preservar essas alterações.':error.message},409);
  return respond(data);
 }catch{return respond({error:'Não foi possível desfazer. Nenhuma alteração parcial foi aplicada.'},500);}
});
