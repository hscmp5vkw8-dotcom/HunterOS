import type { OutreachCandidate, Product } from './types.ts';
import { privateProductURL } from './product-import-data.ts';
const key=(name:string)=>name.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
// Source-stated identities are leads for review, never proof of a legal maker or affiliate program.
// This list stays inside the device workspace and is never sent to the shared catalog.
export function queueProductCandidate(existing:OutreachCandidate[],product:Product):OutreachCandidate[] {
 const url=privateProductURL(product.sourceURL),facts=product.imported?.facts;
 const identities:{name:string;role:OutreachCandidate['role']}[]=[];
 if(facts?.manufacturer)identities.push({name:facts.manufacturer,role:'manufacturer'});
 if(product.brand&&!identities.some(i=>key(i.name)===key(product.brand)))identities.push({name:product.brand,role:'brand'});
 if(!identities.length)identities.push({name:'Maker unknown',role:'unresolved'});
 const next=JSON.parse(JSON.stringify(existing)) as OutreachCandidate[];
 for(const identity of identities){const id=identity.role==='unresolved'?'unresolved:'+url:'identity:'+key(identity.name);let candidate=next.find(c=>c.id===id);
  if(!candidate){if(next.length>=1000)throw Error('Outreach candidate list is full. Remove a candidate before importing another product.');candidate={id,name:identity.name,role:identity.role,status:identity.role==='unresolved'?'needs-review':'source-stated',sources:[]};next.push(candidate);}
  if(identity.role==='manufacturer')candidate.role='manufacturer';
  const source={url,product:product.name,checkedAt:product.checkedAt};const at=candidate.sources.findIndex(s=>s.url===url);
  if(at>=0)candidate.sources[at]=source;else if(candidate.sources.length<100)candidate.sources.push(source);
 }
 return next;
}
export function readCandidates(value:unknown):OutreachCandidate[] {
 if(!Array.isArray(value)||value.length>1000)throw Error('Invalid outreach candidates in backup.');
 const text=(v:unknown,max:number)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Invalid outreach candidate in backup.');return v;};
 const result=value.map(v=>{if(!v||!['brand','manufacturer','unresolved'].includes(v.role)||!['source-stated','needs-review'].includes(v.status)||!Array.isArray(v.sources)||!v.sources.length||v.sources.length>100)throw Error('Invalid outreach candidate in backup.');
  const sources=v.sources.map((s:any)=>({url:privateProductURL(text(s.url,2048)),product:text(s.product,200),checkedAt:typeof s.checkedAt==='string'&&s.checkedAt.length<=40?s.checkedAt:''}));
  if(new Set(sources.map((s:any)=>s.url)).size!==sources.length)throw Error('Duplicate outreach sources in backup.');
  return {id:text(v.id,2200),name:text(v.name,80),role:v.role,status:v.status,sources} as OutreachCandidate;
 });
 if(new Set(result.map(c=>c.id)).size!==result.length)throw Error('Duplicate outreach candidates in backup.');return result;
}
