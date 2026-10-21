import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NATIVE_FIELDS } from '@/lib/importMappings';
import { type MixedConfig, type MixedEntity, type MixedMapping, type MixedPlan } from '@/lib/importCombined';

interface Props { config:MixedConfig; headers:string[]; rows:Record<string,unknown>[]; onChange:(c:MixedConfig)=>void; plan:MixedPlan; stage:number }
const labels={patients:'Pacientes',assessments:'Avaliações',session_notes:'Evoluções',shared:'Identificação compartilhada',external:'Preservar como externo',ignore:'Ignorar',pending:'Escolher destino'};
export default function CombinedImportEditor({config,headers,rows,onChange,plan,stage}:Props){
 const update=(index:number,patch:Partial<MixedMapping>)=>onChange({...config,mappings:config.mappings.map((m,i)=>i===index?{...m,...patch}:m)});
 const types=config.typeColumn ? [...new Set(rows.map(r=>String(r[config.typeColumn] ?? '').trim().toLowerCase()))] : [];
 if(stage===2)return <div className="space-y-3">
  <Label>Organização do arquivo</Label>
  <Select value={config.layout} onValueChange={v=>onChange({...config,layout:v as MixedConfig['layout']})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="wide">Colunas por categoria ou bloco</SelectItem><SelectItem value="typed">Categoria indicada em cada linha</SelectItem></SelectContent></Select>
  {config.layout==='typed' && <><Label>Coluna da categoria</Label><Select value={config.typeColumn || '__none'} onValueChange={v=>onChange({...config,typeColumn:v==='__none'?'':v,mappings:config.mappings.map(m=>m.source===v?{...m,entity:'ignore',target:''}:m)})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Selecionar</SelectItem>{headers.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>{types.slice(0,100).map(type=><div key={type} className="grid grid-cols-2 gap-2 items-center"><span className="break-words text-sm">{type || '(vazio)'}</span><Select value={config.types[type] ?? '__none'} onValueChange={v=>onChange({...config,types:{...config.types,[type]:v as MixedEntity}})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Selecionar</SelectItem>{(['patients','assessments','session_notes'] as MixedEntity[]).map(e=><SelectItem key={e} value={e}>{labels[e]}</SelectItem>)}</SelectContent></Select></div>)}</>}
 </div>;
 if(stage===3)return <div className="space-y-3">{config.mappings.map((m,i)=>{
  const native=m.entity==='patients'||m.entity==='assessments'||m.entity==='session_notes' ? NATIVE_FIELDS[m.entity] : [];
  return <div key={m.source} className="border-b pb-3 space-y-2"><div className="font-mono text-xs break-words">{m.source}</div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><Select value={m.entity} onValueChange={v=>update(i,{entity:v as MixedMapping['entity'],target:'',group:'1'})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([e,label])=><SelectItem key={e} value={e}>{label}</SelectItem>)}</SelectContent></Select>
  {m.entity==='shared'?<Select value={m.target || '__none'} onValueChange={v=>update(i,{target:v==='__none'?'':v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Selecionar campo</SelectItem><SelectItem value="patient_name">Nome do paciente</SelectItem><SelectItem value="patient_email">E-mail do paciente</SelectItem><SelectItem value="cpf">CPF</SelectItem><SelectItem value="source_patient_id">Código do paciente na origem</SelectItem></SelectContent></Select>:native.length>0?<><Select value={m.target || '__none'} onValueChange={v=>update(i,{target:v==='__none'?'':v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Selecionar campo</SelectItem>{native.map(f=><SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent></Select><Input aria-label={`Bloco de ${m.source}`} type="number" min={1} max={100} value={m.group} onChange={e=>update(i,{group:e.target.value})}/></>:null}</div></div>;
 })}</div>;
 return <div className="space-y-3"><div className="flex flex-wrap gap-3 text-sm">{Object.entries(plan.counts).map(([e,count])=><span key={e}>{labels[e as MixedEntity]}: <strong>{count}</strong></span>)}</div>
 {plan.issues.length>0 && <div className="border border-destructive rounded p-3 text-sm"><strong>{plan.issues.length} pendência(s)</strong><ul className="mt-2 space-y-1">{plan.issues.slice(0,30).map((p,i)=><li key={i}>Linha {p.sourceRow} · {p.group}: {p.error}</li>)}</ul></div>}
 {plan.records.slice(0,10).map((r,i)=><div key={i} className="border rounded p-3 text-xs space-y-1"><strong>{labels[r.entity as MixedEntity]} · linha {r.sourceRow} · {r.group}</strong>{Object.entries(r.row).filter(([,v])=>v!=null).map(([k,v])=><div key={k} className="whitespace-pre-wrap break-words">{k}: {String(v)}</div>)}</div>)}
 {stage===4 && <Button variant="outline" onClick={()=>onChange({...config})}>Rever conferência</Button>}
 </div>;
}
