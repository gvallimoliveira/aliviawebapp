import { NATIVE_FIELDS, guessMapping, normalizeValue, type EntityKey } from './importMappings';
import { identity, validateImportRow } from '../../supabase/functions/_shared/import-rules';

export type MixedEntity = 'patients' | 'assessments' | 'session_notes';
export interface MixedMapping { source: string; entity: MixedEntity | 'shared' | 'external' | 'ignore' | 'pending'; target: string; group: string }
export interface MixedConfig { layout: 'wide' | 'typed'; typeColumn: string; types: Record<string, MixedEntity>; mappings: MixedMapping[] }
export interface ImportRecord { entity: EntityKey; row: Record<string, unknown>; external: Record<string, unknown>; sourceRow: number; group: string }
export interface MixedPlan { records: ImportRecord[]; issues: { sourceRow: number; group: string; error: string }[]; counts: Record<MixedEntity, number> }
const clean = (s: string) => identity(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const reserved = ['id', 'user_id', 'professional_id', 'clinic_id', 'import_batch_id', 'role', 'token'];
const aliases: Record<string, string> = { texto: 'content', evolucao: 'content', data: 'created_at', data_avaliacao: 'created_at', data_evolucao: 'note_date', subjetivo: 'subjective', objetivo: 'objective', avaliacao: 'assessment', plano: 'plan', nome_paciente: 'patient_name', email_paciente: 'patient_email', queixa_principal: 'chief_complaint', historia_clinica: 'history', impressao_clinica: 'clinical_impression', testes_funcionais: 'functional_tests' };
export function suggestMixedConfig(headers: string[]): MixedConfig {
  const typeColumn = headers.find(h => ['tipo', 'categoria', 'tipo_registro', 'record_type'].includes(clean(h))) ?? '';
  const mappings = headers.map((source): MixedMapping => {
    const h = clean(source);
    if (source === typeColumn) return { source, entity: 'ignore', target: '', group: '1' };
    if (['codigo_paciente', 'patient_code', 'source_patient_id', 'paciente_id', 'id_paciente'].includes(h)) return { source, entity: 'shared', target: 'source_patient_id', group: '1' };
    if (reserved.includes(h)) return { source, entity: 'pending', target: '', group: '1' };
    const shared: Record<string,string> = { nome: 'patient_name', paciente: 'patient_name', full_name: 'patient_name', patient_name: 'patient_name', nome_completo: 'patient_name', email: 'patient_email', patient_email: 'patient_email', cpf: 'cpf' };
    if (shared[h]) return { source, entity: 'shared', target: shared[h], group: '1' };
    const m = h.match(/^(avaliacao|assessment|evolucao|evolution|session)(?:_(\d+))?_(.+)$/);
    if (m) {
      const entity: MixedEntity = ['avaliacao','assessment'].includes(m[1]) ? 'assessments' : 'session_notes';
      const suffix = m[3].match(/^(.+?)_(\d+)$/);
      const key = suffix?.[1] ?? m[3];
      const target = key === 'data' ? (entity === 'assessments' ? 'created_at' : 'note_date') : aliases[key] ?? guessMapping(key.replace(/_/g,' '), entity);
      return { source, entity, target: NATIVE_FIELDS[entity].some(f => f.key === target) ? target : '', group: m[2] ?? suffix?.[2] ?? '1' };
    }
    for (const entity of ['patients','assessments','session_notes'] as MixedEntity[]) {
      const target = aliases[h] ?? guessMapping(source,entity);
      if (NATIVE_FIELDS[entity].some(f => f.key === target)) return { source, entity, target, group: '1' };
    }
    return { source, entity: 'pending', target: '', group: '1' };
  });
  return { layout: typeColumn ? 'typed' : 'wide', typeColumn, types: { paciente:'patients', patients:'patients', avaliacao:'assessments', assessments:'assessments', evolucao:'session_notes', session_notes:'session_notes' }, mappings };
}
export function buildMixedPlan(rows: Record<string,unknown>[], config: MixedConfig): MixedPlan {
  const issues: MixedPlan['issues'] = [];
  const candidates: ImportRecord[] = [];
  const patients = new Map<string, ImportRecord>();
  const sourceKeys = new Map<string,string>();
  const badKeys = new Set<string>();
  const issue = (sourceRow:number,group:string,error:string) => issues.push({sourceRow,group,error});
  if (rows.length > 50000) return { records:[], issues:[{sourceRow:0,group:'',error:'Máximo de 50.000 linhas de origem.'}],counts:{patients:0,assessments:0,session_notes:0} };
  const pending = config.mappings.filter(m => m.entity === 'pending' || (!['external','ignore'].includes(m.entity) && !m.target));
  if (pending.length) return {records:[],issues:pending.map(m => ({sourceRow:0,group:'',error:`Defina o destino de ${m.source}.`})),counts:{patients:0,assessments:0,session_notes:0}};
  rows.forEach((raw,index) => {
    const sourceRow = index + 1;
    const shared: Record<string,unknown> = {};
    const external: Record<string,unknown> = {};
    const groups = new Map<string, { entity:MixedEntity; row:Record<string,unknown>; failed:boolean }>();
    const typed = config.layout === 'typed' ? config.types[identity(raw[config.typeColumn])] ?? config.types[clean(String(raw[config.typeColumn] ?? ''))] : undefined;
    if (config.layout === 'typed' && !typed) {issue(sourceRow,'', 'Categoria da linha não reconhecida.');return;}
    for (const m of config.mappings) {
      const value = raw[m.source];
      if (value == null || String(value).trim() === '' || m.entity === 'ignore') continue;
      if (m.entity === 'external') {external[m.source]=value;continue;}
      if (m.entity === 'shared') {if (shared[m.target] != null) issue(sourceRow,'',`Identificação duplicada: ${m.target}.`);shared[m.target]=String(value).trim();continue;}
      if (!['patients','assessments','session_notes'].includes(m.entity)) continue;
      const entity = m.entity as MixedEntity;
      if (typed && entity !== 'patients' && entity !== typed) continue;
      const key = `${entity}:${m.group}`;
      const group = groups.get(key) ?? {entity,row:{},failed:false};
      if (!NATIVE_FIELDS[entity].some(f => f.key === m.target) || group.row[m.target] != null) {issue(sourceRow,key,`Campo inválido ou repetido: ${m.target}.`);group.failed=true;}
      else try {group.row[m.target]=normalizeValue(m.target,value);} catch (e) {issue(sourceRow,key,String((e as Error).message));group.failed=true;}
      groups.set(key,group);
    }
    const patientGroup = [...groups.values()].find(g => g.entity === 'patients');
    const patientRow: Record<string,unknown> = {...(patientGroup?.row ?? {}),full_name:shared.patient_name ?? patientGroup?.row.full_name,email:shared.patient_email ?? patientGroup?.row.email,cpf:shared.cpf ?? patientGroup?.row.cpf};
    const sourceKey = String(shared.source_patient_id ?? '').trim();
    const email = identity(patientRow.email); const cpf=String(patientRow.cpf ?? '').replace(/\D/g,''); const name=identity(patientRow.full_name);
    const key = sourceKey ? `source:${sourceKey}` : email ? `email:${email}` : cpf ? `cpf:${cpf}` : `name:${name}`;
    if (!name) {issue(sourceRow,'patients','Informe o nome do paciente; código sozinho não é suficiente.');return;}
    const declaration: ImportRecord = {entity:'patients',row:patientRow,external:{...external, ...(sourceKey?{source_patient_id:sourceKey}:{})},sourceRow,group:'patients'};
    const existing=patients.get(key);
    if (existing) {
      const conflicts=Object.entries(patientRow).some(([k,v]) => v != null && v!=='' && existing.row[k]!=null && identity(existing.row[k])!==identity(v));
      if(conflicts){badKeys.add(key);issue(sourceRow,'patients','Cadastros repetidos com informações conflitantes.');}
      else {for(const [k,v]of Object.entries(patientRow))if(v!=null && v!=='')existing.row[k]=v;Object.assign(existing.external,external);}
    } else patients.set(key,declaration);
    if(sourceKey)sourceKeys.set(sourceKey,key);
    for (const [group,g] of groups) {
      if(g.entity==='patients' || g.failed)continue;
      const row={...g.row,patient_name:patientRow.full_name,patient_email:patientRow.email,cpf:patientRow.cpf};
      candidates.push({entity:g.entity,row,external:{...external, source_line:sourceRow, source_group:group, ...(sourceKey?{source_patient_id:sourceKey}:{})},sourceRow,group});
    }
  });
  // Reconcile all declarations before children, including conflicts beyond the visible sample.
  const declarations=[...patients.entries()];
  const seen = new Map<string,string>();
  const byName = new Map<string,{key:string;email:unknown}>();
  for(const[key,p]of declarations){
    const keys=[p.row.email?`email:${identity(p.row.email)}`:'',p.row.cpf?`cpf:${String(p.row.cpf).replace(/\D/g,'')}`:''].filter(Boolean);
    const name=identity(p.row.full_name);const prior=byName.get(name);
    if(prior && (!prior.email || !p.row.email)){badKeys.add(key);badKeys.add(prior.key);issue(p.sourceRow,'patients','Homônimos sem identificação inequívoca.');}
    else byName.set(name,{key,email:p.row.email});
    for(const id of keys){const previous=seen.get(id);if(previous && previous!==key){badKeys.add(key);badKeys.add(previous);issue(p.sourceRow,'patients','Identificações sobrepostas; revise os cadastros antes de vincular.');}else seen.set(id,key);}
  }
  const lookup=new Map<string,ImportRecord>();
  for(const[,p]of declarations)lookup.set(identity(p.row.email ?? p.row.full_name),p);
  const valid:ImportRecord[]=[];
  for(const[key,p]of declarations){if(badKeys.has(key))continue;try{validateImportRow('patients',p.row);valid.push(p);}catch(e){badKeys.add(key);issue(p.sourceRow,p.group,(e as Error).message);}}
  for(const c of candidates){
    const source=String(c.external.source_patient_id ?? '');
    const p=source ? patients.get(sourceKeys.get(source) ?? '') : lookup.get(identity(c.row.patient_email ?? c.row.patient_name));
    const key=source?sourceKeys.get(source):declarations.find(([,d])=>d===p)?.[0];
    if(!p || !key || badKeys.has(key)){issue(c.sourceRow,c.group,'Paciente não resolvido com segurança.');continue;}
    c.row.patient_name=p.row.full_name;c.row.patient_email=p.row.email;c.row.cpf=p.row.cpf;
    try{
      if(c.entity==='assessments' && !c.row.created_at)throw new Error('Data da avaliação ausente.');
      if(c.entity==='session_notes' && ![c.row.content,c.row.subjective,c.row.objective,c.row.assessment,c.row.plan].some(v=>v!=null && String(v).trim()))throw new Error('Evolução sem conteúdo.');
      validateImportRow(c.entity,c.row);valid.push(c);
    }catch(e){issue(c.sourceRow,c.group,(e as Error).message);}
  }
  if(valid.length>50000) return {records:[],issues:[{sourceRow:0,group:'',error:'Máximo de 50.000 registros gerados.'}],counts:{patients:0,assessments:0,session_notes:0}};
  return {records:valid,issues,counts:{patients:valid.filter(r=>r.entity==='patients').length,assessments:valid.filter(r=>r.entity==='assessments').length,session_notes:valid.filter(r=>r.entity==='session_notes').length}};
}
export function chunkImportRecords<T>(rows:T[], maxRows=250,maxBytes=512*1024):T[][] {
  const chunks:T[][]=[];let current:T[]=[];let bytes=2;
  for(const row of rows){const size=new TextEncoder().encode(JSON.stringify(row)).length+1;if(size>maxBytes)throw new Error('Um registro excede 512 KB; revise o conteúdo.');if(current.length>=maxRows || bytes+size>maxBytes){chunks.push(current);current=[];bytes=2;}current.push(row);bytes+=size;}
  if(current.length)chunks.push(current);return chunks;
}
