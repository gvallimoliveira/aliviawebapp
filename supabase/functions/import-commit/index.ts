import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { IMPORT_ENTITIES, findPatient, validateImportRow, sameImportedRecord } from '../_shared/import-rules.ts';
const schema=z.object({entity:z.enum(IMPORT_ENTITIES),rows:z.array(z.record(z.unknown())).min(1).max(5000),externalRows:z.array(z.record(z.unknown())).optional(),dedup:z.enum(['create','merge','skip']),professionalId:z.string().uuid().optional(),clinicId:z.string().uuid().optional(),sourceFilename:z.string().min(1).max(500),sourceFormat:z.enum(['csv','json','xml','zip-alivia']).optional(),preflight:z.boolean().optional(),safeRetry:z.boolean().optional(),historical:z.boolean().optional(),operationId:z.string().uuid().optional()});
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 let batchId:string|undefined;
 const admin=createClient(Deno.env.get('SUPABASE_URL') ?? '',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
 try {
  const token=(req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i,'');
  const {data:auth,error:authError}=await admin.auth.getUser(token);
  if(authError || !auth.user) return respond({error:'unauthenticated'},401);
  const parsed=schema.safeParse(await req.json());
  if(!parsed.success) return respond({error:'Arquivo ou parâmetros inválidos.',detail:parsed.error.flatten()},400);
  const body=parsed.data; let professionalId=body.professionalId;
  if(body.clinicId){
   const {data:member}=await admin.from('clinic_members').select('role').eq('clinic_id',body.clinicId).eq('user_id',auth.user.id).eq('status','active').maybeSingle();
   if(!member || !['owner','admin','therapist'].includes(member.role)) return respond({error:'forbidden'},403);
   if(professionalId){
    const {data:pro}=await admin.from('professionals').select('user_id').eq('id',professionalId).maybeSingle();
    const {data:assigned}=await admin.from('clinic_members').select('role').eq('clinic_id',body.clinicId).eq('user_id',pro?.user_id ?? '').eq('status','active').maybeSingle();
    if(!assigned || !['owner','admin','therapist','osteopath','pilates_instructor','doctor','rpg_specialist','massage_therapist'].includes(assigned.role) || (member.role==='therapist' && pro?.user_id!==auth.user.id)) return respond({error:'Responsável não autorizado nesta clínica.'},403);
   }else{
    const {data:own}=await admin.from('professionals').select('id').eq('user_id',auth.user.id).maybeSingle(); professionalId=own?.id;
   }
  }else{
   if(!professionalId) return respond({error:'scope_required'},400);
   const {data:own}=await admin.from('professionals').select('id').eq('id',professionalId).eq('user_id',auth.user.id).maybeSingle();
   if(!own) return respond({error:'forbidden'},403);
  }
  if(['session_notes','appointments'].includes(body.entity) && !professionalId) return respond({error:'Selecione um profissional responsável da clínica.'},400);
  const scope=(q:any)=>body.clinicId?q.eq('clinic_id',body.clinicId):q.eq('professional_id',professionalId).is('clinic_id',null);
  const patients:Record<string,any>[]=[];
  for(let offset=0;;offset+=1000){const {data,error}=await scope(admin.from('patients').select('*')).range(offset,offset+999);if(error)throw error;patients.push(...data);if(data.length<1000)break;}
  const validationErrors:{index:number;error:string}[]=[];
  for(let i=0;i<body.rows.length;i++)try{
    const row=body.rows[i];validateImportRow(body.entity,row);
    if(body.historical && body.entity==='assessments' && !row.created_at)throw new Error('Data da avaliação ausente.');
    const p=findPatient(patients,row);
    if(body.historical && body.entity==='session_notes' && !p)throw new Error('Paciente não encontrado no escopo autorizado.');
    if(body.historical && body.entity==='session_notes' && ![row.content,row.subjective,row.objective,row.assessment,row.plan].some(v=>v!=null && String(v).trim()))throw new Error('Evolução sem conteúdo.');
  }catch(e){validationErrors.push({index:i,error:(e as Error).message});}
  if(body.preflight)return respond({errors:validationErrors.length,errorsDetail:validationErrors.slice(0,50)});
  if(body.historical && validationErrors.length)return respond({error:'Há pendências de validação; nenhuma linha deste lote foi gravada.',errorsDetail:validationErrors.slice(0,50)},400);
  let requestKey:string|null=null;
  if(body.safeRetry){
    const text=JSON.stringify({entity:body.entity,rows:body.rows,external:body.externalRows,clinic:body.clinicId,professional:professionalId,dedup:body.dedup,source:body.sourceFilename,operation:body.operationId});
    requestKey=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const {data:prior,error:priorError}=await admin.from('import_batches').select('id,status,summary').eq('user_id',auth.user.id).eq('request_key',requestKey).maybeSingle();
    if(priorError)throw priorError;
    if(prior){
      if(prior.status==='undone'){await admin.from('import_batches').update({request_key:null}).eq('id',prior.id);}
      else if(prior.status==='completed')return respond({batchId:prior.id,...prior.summary,reused:true});
      else return respond({error:'Um lote anterior ficou pendente. Desfaça-o antes de reenviar.',batchId:prior.id},409);
    }
  }
  const {data:batch,error:batchError}=await admin.from('import_batches').insert({user_id:auth.user.id,clinic_id:body.clinicId ?? null,professional_id:professionalId ?? null,source_filename:body.sourceFilename,source_format:body.sourceFormat,status:'running',summary:{journal_version:1},request_key:requestKey,operation_id:body.operationId ?? null}).select('id').single();
  if(batchError)throw batchError; batchId=batch.id;
  let created=0,updated=0,skipped=0; const errorsDetail:{index:number;error:string}[]=[];
  for(let i=0;i<body.rows.length;i++){
   try{
    const row=body.rows[i]; validateImportRow(body.entity,row);
    const ext=body.externalRows?.[i] ?? {};
    let table=''; let payload:Record<string,any>={}; let existing:Record<string,any>|null=null;
    const scoped={clinic_id:body.clinicId ?? null,professional_id:professionalId ?? null};
    if(body.entity==='patients'){
     table='patients'; if(body.dedup!=='create')existing=findPatient(patients,row);
     if(existing && body.dedup==='skip'){skipped++;continue;}
     for(const k of ['full_name','email','phone','cpf','birth_date','sex','occupation','address','notes'])if(row[k]!=null && row[k]!=='')payload[k]=row[k];
     if(!existing)Object.assign(payload,scoped);
     payload.external_import_data={...(existing?.external_import_data ?? {}),...ext};
    }else{
     const patient=findPatient(patients,row); const email=String(row.patient_email ?? patient?.email ?? '').trim(); const name=patient?.full_name ?? row.patient_name;
     if(body.entity==='assessments'){
      table='assessments'; const an:Record<string,any>={...(row.anamnesis_data as object ?? {})};
      const map:Record<string,string>={chief_complaint:'chiefComplaint',history:'history',duration:'painDuration',onset:'painOnset',aggravating_factors:'aggravatingFactors',relieving_factors:'relievingFactors',medications:'medications',previous_surgeries:'previousSurgeries',comorbidities:'comorbidities',occupation:'occupation',complementary_exams:'complementaryExams',pain_type:'painType',functional_tests:'functionalTests',clinical_impression:'clinicalImpression'};
      for(const [k,v]of Object.entries(map))if(row[k]!=null)an[v]=row[k];
      const diagnosis=row.diagnosis ?? (row.diagnosis_text?{hypothesis:row.diagnosis_text,summary:row.diagnosis_text}:null);
      if(row.clinical_impression)an.clinicalImpression=row.clinical_impression;
      payload={...scoped,type:'professional',status:'completed',patient_name:name,patient_email:email || null,pain_score:row.pain_score ?? null,anamnesis_data:an,test_results:row.test_results ?? {},diagnosis:diagnosis && typeof diagnosis==='object'?{...diagnosis, ...(row.clinical_impression?{clinicalImpression:{summary:row.clinical_impression}}:{})}:null};
      if(row.created_at)payload.created_at=row.created_at;
     }else if(body.entity==='session_notes'){
      table='session_notes'; payload={...scoped,patient_email:email,content:row.content || [row.subjective,row.objective,row.assessment,row.plan].filter(Boolean).join('\n\n'),session_date:row.note_date};
     }else if(body.entity==='appointments'){
      table='professional_appointments'; payload={...scoped,patient_name:name,patient_email:email || null,appointment_date:row.appointment_date,appointment_time:row.appointment_time ?? '09:00',duration_minutes:Number(row.duration_minutes ?? 50),status:row.status ?? 'scheduled',notes:row.notes ?? null};
     }else{
      if(!patient)throw new Error('Paciente não encontrado neste consultório/clínica.');
      const {data:assessments,error}=await scope(admin.from('assessments').select('user_id').eq('patient_email',email).not('user_id','is',null));
      if(error)throw error; const ids=[...new Set(assessments.map((a:any)=>a.user_id))];
      if(ids.length!==1)throw new Error('Diário exige conta do paciente vinculada a uma avaliação deste consultório/clínica.');
      table='pain_diary_entries'; payload={user_id:ids[0],pain_score:Number(row.pain_score),notes:row.note ?? null,logged_at:row.logged_at};
     }
     if(body.dedup!=='create'){
      let q=admin.from(table).select('*'); q=table==='pain_diary_entries'?q.eq('user_id',payload.user_id):scope(q);
      if(table==='assessments')q=q.eq('patient_name',payload.patient_name);
      if(table==='session_notes')q=q.eq('patient_email',email).eq('session_date',payload.session_date);
      if(table==='professional_appointments')q=q.eq('patient_name',payload.patient_name).eq('appointment_date',payload.appointment_date);
      if(table==='pain_diary_entries')q=q.eq('logged_at',payload.logged_at);
      const {data,error}=await q; if(error)throw error;
      if(data.some((r:any)=>sameImportedRecord(r,payload))){skipped++;continue;}
     }
     payload.external_import_data=ext;
    }
    const {data:id,error}=await admin.rpc('import_write_record',{p_batch:batchId,p_table:table,p_data:payload,p_id:existing?.id ?? null});
    if(error)throw error;
    if(existing){updated++; Object.assign(existing,payload);}else{created++;if(table==='patients')patients.push({id,...payload});}
   }catch(e){errorsDetail.push({index:i,error:e instanceof Error?e.message:String((e as any)?.message ?? e)});}
  }
  const summary={journal_version:1,entity:body.entity,total:body.rows.length,created,updated,skipped,errors:errorsDetail.length};
  const {error:finalError}=await admin.from('import_batches').update({status:errorsDetail.length?'partial':'completed',summary}).eq('id',batchId);if(finalError)throw finalError;
  return respond({batchId,...summary,errorsDetail:errorsDetail.slice(0,50)});
 }catch(e){if(batchId)await admin.from('import_batches').update({status:'partial'}).eq('id',batchId);return respond({error:(e as any)?.message ?? 'Falha na importação.',batchId},500);}
});
