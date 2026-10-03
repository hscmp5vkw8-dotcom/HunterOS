import { useEffect, useRef, useState, useCallback } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Text } from 'react-native';
import { Button, Card, Chips, ErrorText, Field, Label, Page, ProductPhoto, s } from '@/ui';
import { useStore } from '@/store';
import { CATEGORIES, newGear, uid, validateGear } from '@/domain';
import { confirmAction } from '@/dialogs';
import { manufacturerProduct } from '@/community';
import { gearProduct, exactProduct } from '@/shared-products';
import { emptyProductFacts, hasUnselectedVariant, importIdentity, importedPrice, privateProductURL } from '@/product-import-data';
import { ProductFactsView } from '@/product-facts-view';
import { queueProductCandidate } from '@/outreach-candidates';
import { rememberSharedProduct, useCatalog } from '@/use-catalog';
import { useAccount } from '@/use-account';
import type { Carry, Category, Product, ProductFacts } from '@/types';

export default function GearEditor(){
 const {id,tripId,loadoutId}=useLocalSearchParams<{id?:string;tripId?:string;loadoutId?:string}>(),{state,commit,saving}=useStore(),router=useRouter();
 const original=(loadoutId?state.loadouts.find(l=>l.id===loadoutId)?.items:tripId?state.trips.find(t=>t.id===tripId)?.items:state.gear)?.find(i=>i.id===id);
 const [base]=useState(()=>original||newGear());const {products}=useCatalog(),account=useAccount();
 const [name,setName]=useState(base.name),[category,setCategory]=useState<Category>(base.category),[grams,setGrams]=useState(base.grams===null?'':String(base.grams)),[price,setPrice]=useState(base.price===null?'':String(base.price)),[calories,setCalories]=useState(base.calories===null?'':String(base.calories)),[quantity,setQuantity]=useState(String(base.quantity)),[carry,setCarry]=useState<Carry>(base.carry),[owned,setOwned]=useState((!tripId&&!loadoutId)||base.owned),[packed,setPacked]=useState(base.packed),[note,setNote]=useState(base.note),[error,setError]=useState('');
 const [brand,setBrand]=useState(base.details?.brand??base.product?.brand??''),[model,setModel]=useState(base.details?.model??base.product?.model??''),[sku,setSKU]=useState(base.details?.sku??base.product?.imported?.sku??'');
 const [attached,setAttached]=useState<Product|null>(base.product),[url,setURL]=useState(base.sourceURL||base.product?.sourceURL||''),[preview,setPreview]=useState<Product|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [facts,setFacts]=useState<ProductFacts>(()=>base.facts||base.product?.imported?.facts||emptyProductFacts()),[servings,setServings]=useState(()=>String(base.facts?.servingCount??base.product?.imported?.facts?.servingCount??''));
 const request=useRef(0),working=useRef(false),saveInFlight=useRef(false);
 const invalidate=useCallback(()=>{request.current++;working.current=false;setBusy(false);setPreview(null);},[]);
 useEffect(()=>{invalidate();},[account.user?.id,invalidate]);
 useFocusEffect(useCallback(()=>()=>{invalidate();},[invalidate]));
 const matched=attached||exactProduct(name,products),shown=matched?gearProduct({...base,product:matched},products):null;
 function changeURL(value:string){invalidate();setAttached(null);setURL(value);setMessage('');setError('');}
 async function lookup(variantKey=''){
  if(working.current)return;working.current=true;const token=++request.current;setBusy(true);setError('');setMessage('');
  try{const p=await manufacturerProduct(url,category,'preview',variantKey);if(token===request.current)setPreview(p);}
  catch(e){if(token===request.current)setError(e instanceof Error?e.message:String(e));}
  finally{if(token===request.current){working.current=false;setBusy(false);}}
 }
 function applyProduct(p:Product){
  setAttached({...p,id:p.id==='import-preview'?'local-product-'+uid():p.id});
  setName(current=>current.trim()?current:p.name);setBrand(current=>current.trim()?current:p.brand);setModel(current=>current.trim()?current:p.model);setSKU(current=>current.trim()?current:p.imported?.sku||'');
  setGrams(current=>current.trim()?current:p.weightGrams===null?'':String(p.weightGrams));
  setPrice(current=>current.trim()?current:p.priceUSD===null?'':String(p.priceUSD));
  if(category==='Other'){setCategory(p.category);if(p.category==='Food & nutrition')setCarry('consumable');}
  setURL(p.sourceURL);setPreview(null);
  if(p.imported?.facts){const source=p.imported.facts;setFacts(current=>({...current,manufacturer:current.manufacturer||source.manufacturer,seller:current.seller||source.seller,parentCompany:current.parentCompany||source.parentCompany,weightBasis:current.weightBasis==='unknown'?source.weightBasis:current.weightBasis,servingSize:current.servingSize||source.servingSize,packSize:current.packSize||source.packSize,servingBasis:current.servingBasis||source.servingBasis,nutrition:current.nutrition.length?current.nutrition:source.nutrition,ingredients:current.ingredients||source.ingredients,allergens:current.allergens||source.allergens}));setServings(current=>current||String(source.servingCount??''));}
  setMessage('Product details filled into blank fields. Review and edit below, then Save gear. Your entered values were kept.');
 }
 async function share(){
  if(!preview||hasUnselectedVariant(preview)||working.current)return;
  working.current=true;const token=++request.current;setBusy(true);setError('');
  try{const p=await manufacturerProduct(url,category,'publish',preview.imported?.selectedVariant||'');if(token!==request.current)return;rememberSharedProduct(p);applyProduct({...preview,id:p.id});setMessage('Shared catalog reference saved or reused. Your current imported details and edits stay in your private gear. Review below, then Save gear.');}
  catch(e){if(token===request.current)setError(e instanceof Error?e.message:String(e));}
  finally{if(token===request.current){working.current=false;setBusy(false);}}
 }
 async function save(){
  if(saveInFlight.current||working.current||preview)return;saveInFlight.current=true;setError('');
  try{
   const sourceURL=privateProductURL(url);
   const product=shown,details={brand:attached?brand:brand||shown?.brand||'',model:attached?model:model||shown?.model||'',sku};
   const value=validateGear({...base,id:id||base.id,product,sourceURL,details,facts:{...facts,servingCount:servings.trim()===''?null:Number(servings),identityEvidence:'unknown'},name:name.trim(),category,grams:grams.trim()===''?null:Number(grams),price:price.trim()===''?null:Number(price),calories:calories.trim()===''?null:Number(calories),quantity:Number(quantity),carry,owned,packed:loadoutId?false:packed,note},!tripId&&!loadoutId);
   await commit(s=>{
    const a=loadoutId?s.loadouts.find(l=>l.id===loadoutId)?.items:tripId?s.trips.find(t=>t.id===tripId)?.items:s.gear;if(!a)throw Error('This trip or loadout no longer exists.');
    const at=a.findIndex(g=>g.id===id);if(id&&at<0)throw Error('Gear no longer exists.');
    if(at<0&&product&&a.some(g=>g.product&&g.id!==value.id&&importIdentity(g.product)===importIdentity(product)))throw Error('This product is already here. Edit its quantity instead.');
    if(at>=0)a[at]=value;else if(!a.some(g=>g.id===value.id))a.push(value);if(product?.imported)s.outreachCandidates=queueProductCandidate(s.outreachCandidates||[],product);return s;
   });
   if(router.canGoBack())router.back();else if(loadoutId)router.replace({pathname:'/loadout/[id]',params:{id:loadoutId}});else if(tripId)router.replace({pathname:'/trip/[id]',params:{id:tripId}});else router.replace('/locker');
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{saveInFlight.current=false;}
 }
 async function remove(){if(!await confirmAction('Remove this item?','Other trip and locker copies, and the shared catalog product, will not be removed.'))return;try{await commit(s=>{if(loadoutId){const l=s.loadouts.find(l=>l.id===loadoutId);if(l)l.items=l.items.filter(i=>i.id!==id);}else if(tripId){const t=s.trips.find(t=>t.id===tripId);if(t)t.items=t.items.filter(i=>i.id!==id);}else s.gear=s.gear.filter(i=>i.id!==id);return s;});router.back();}catch(e){setError(String(e));}}
 if(id&&!original)return <Page><Text style={s.h2}>Gear not found.</Text><Button title="Back to locker" onPress={()=>router.replace('/locker')}/></Page>;
 return <Page>
  <Label>{loadoutId?'LOADOUT EQUIPMENT':tripId?'TRIP EQUIPMENT':'OWNED EQUIPMENT'}</Label>
  <Card><Label>IMPORT FROM A PRODUCT LINK</Label><Text style={s.body}>Paste a public product page from a brand or retailer to find its available details. Review the result before applying or sharing. Missing values stay blank. Blocked sites can be kept as a private link.</Text>
   <Field label="Product page link" value={url} onChangeText={changeURL} placeholder="https://www.mysteryranch.com/pop-up-30-pack" autoCapitalize="none" autoCorrect={false} keyboardType="url" maxLength={2048}/>
   <Button secondary title={busy?'Checking product page...':'Import product details'} onPress={()=>void lookup()} disabled={busy||!url.trim()}/>
   {!account.user?<Button secondary title="Sign in to import product details" onPress={()=>router.push('/account')}/>:null}
   {preview?<><Text style={s.h2}>Review product details</Text><ProductPhoto product={preview} height={200}/>
    <Text selectable style={s.body}>Name: {preview.name}{'\n'}Brand: {preview.brand||'Not provided'}{'\n'}Model: {preview.model||'Not provided'}{'\n'}SKU: {preview.imported?.sku||'Not provided'}{'\n'}Category from page: {preview.imported?.sourceCategory||'Not provided — choose below'}{'\n'}Price: {importedPrice(preview)}{'\n'}Weight: {preview.weightLabel||'Not provided'}</Text>
    <Text selectable style={s.small}>{preview.imported?.attribution||preview.note}{'\n'}Source: {preview.sourceURL}</Text>
    {preview.imported?.facts?<ProductFactsView facts={preview.imported.facts}/>:null}
    {preview.imported?.missing.length?<Text style={s.small}>Not provided: {preview.imported.missing.join(', ')}. Enter these only if you know them.</Text>:null}
    {preview.imported?.currency&&preview.imported.currency!=='USD'?<Text style={s.small}>The source price is retained in {preview.imported.currency}. Enter your price in USD below; no currency conversion is assumed.</Text>:null}
    {preview.imported?.variants.length?<><Text style={s.h2}>Choose your exact variant</Text>{preview.imported.variants.map(v=><Button key={v.key} secondary title={(preview.imported?.selectedVariant===v.key?'Selected: ':'Choose: ')+v.label} disabled={busy} onPress={()=>void lookup(v.key)}/>)}</>:null}
    <Text style={s.small}>Applying fills blank fields and keeps values you have entered. Confirm size, color and accessories; the page weight may be rounded. Edit private gear details below before saving.</Text>
    <Button secondary title="Open product page" onPress={()=>void Linking.openURL(preview.sourceURL).catch(()=>setError('Could not open the product page.'))}/>
    <Button title="Apply details to my private gear" onPress={()=>applyProduct(preview)} disabled={busy||hasUnselectedVariant(preview)}/>
    <Button secondary title="Share source product details with everyone" onPress={()=>void share()} disabled={busy||hasUnselectedVariant(preview)}/>
    <Button secondary title="Discard import preview" onPress={()=>{invalidate();setError('');}} disabled={busy}/>
   </>:null}
   {message?<Text accessibilityRole="alert" style={s.body}>{message}</Text>:null}
   <Text style={s.small}>Saving an imported item collects its source-stated maker or brand in your private outreach candidate list. Legal identities and affiliate programs still need review.</Text>
   {url&&!preview?<Button secondary title="Open saved product link" onPress={()=>{try{void Linking.openURL(privateProductURL(url)).catch(()=>setError('Could not open the product page.'));}catch(e){setError(String(e));}}}/>:null}
  </Card>
  <Field label="Item name" value={name} onChangeText={setName} placeholder="My pack, food pouch or rain jacket" maxLength={200}/>
  {shown?.photo?<ProductPhoto product={shown} height={210}/>:null}
  <Field label="Brand (blank if unknown)" value={brand} onChangeText={setBrand} maxLength={80}/>
  <Field label="Model (blank if unknown)" value={model} onChangeText={setModel} maxLength={100}/>
  <Field label="SKU (blank if unknown)" value={sku} onChangeText={setSKU} maxLength={100}/>
  <Field label="Manufacturer (blank if unknown)" value={facts.manufacturer} onChangeText={manufacturer=>setFacts({...facts,manufacturer})} maxLength={80}/>
  <Field label="Seller / site (blank if unknown)" value={facts.seller} onChangeText={seller=>setFacts({...facts,seller})} maxLength={80}/>
  <Field label="Parent company (blank if unknown)" value={facts.parentCompany} onChangeText={parentCompany=>setFacts({...facts,parentCompany})} maxLength={80}/>
  <Text style={s.small}>Weight basis - shipping weight is excluded</Text><Chips values={['unknown','product','net','pack']} value={facts.weightBasis} onChange={v=>setFacts({...facts,weightBasis:v as ProductFacts['weightBasis']})}/>
  <Text style={s.small}>Category</Text><Chips values={CATEGORIES} value={category} onChange={v=>{if(!busy)setCategory(v as Category);}}/>
  <Field label="Weight per unit in grams (blank if unknown)" value={grams} onChangeText={setGrams} keyboardType="decimal-pad"/>
  <Text style={s.small}>1 oz = 28.3495 g · 1 lb = 453.59237 g. Weigh your complete configuration, including accessories.</Text>
  <Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad"/>
  <Field label="Price per unit USD (blank if unknown)" value={price} onChangeText={setPrice} keyboardType="decimal-pad"/>
  {category==='Food & nutrition'?<Card><Field label="Pack size (blank if unknown)" value={facts.packSize||''} onChangeText={packSize=>setFacts({...facts,packSize})} maxLength={200}/><Field label="Source serving basis (blank if unknown)" value={facts.servingBasis||''} onChangeText={servingBasis=>setFacts({...facts,servingBasis})} maxLength={200}/><Field label="Calories per unit / package" value={calories} onChangeText={setCalories} keyboardType="number-pad"/><Field label="Servings per package (blank if unknown)" value={servings} onChangeText={setServings} keyboardType="decimal-pad"/><Field label="Serving size (blank if unknown)" value={facts.servingSize} onChangeText={servingSize=>setFacts({...facts,servingSize})} maxLength={200}/>{['calories','proteinContent','carbohydrateContent','fatContent','fiberContent','sugarContent','sodiumContent'].map(name=><Field key={name} label={'Source nutrition: '+name} value={facts.nutrition.find(n=>n.name===name)?.value||''} onChangeText={value=>setFacts({...facts,nutrition:[...facts.nutrition.filter(n=>n.name!==name),...(value?[{name,value}]:[])]})} maxLength={200}/>)}<Field label="Ingredients (blank if unknown)" value={facts.ingredients} onChangeText={ingredients=>setFacts({...facts,ingredients})} multiline maxLength={1000}/><Field label="Allergens (blank if unknown)" value={facts.allergens} onChangeText={allergens=>setFacts({...facts,allergens})} multiline maxLength={1000}/><Text style={s.small}>Enter calories for the unit you are packing. Source nutrition may describe a single serving rather than the complete package. No totals are inferred; verify your exact label and allergens.</Text></Card>:null}
  <Chips values={['In pack','Worn','Consumable']} value={carry==='packed'?'In pack':carry==='worn'?'Worn':'Consumable'} onChange={v=>setCarry(v==='In pack'?'packed':v==='Worn'?'worn':'consumable')}/>
  {tripId||loadoutId?<><Button secondary title={owned?'Owned':'Not owned'} onPress={()=>setOwned(!owned)}/>{!loadoutId?<Button secondary title={packed?'Packed':'Not packed'} onPress={()=>setPacked(!packed)}/>:null}</>:null}
  <Field label="Configuration / notes" value={note} onChangeText={setNote} multiline maxLength={2000}/>
  <Text style={s.small}>Unknown values stay blank and are excluded from partial totals. Source prices are references, not live offers. Your notes and edits stay private.</Text>
  <ErrorText message={error}/><Button title={saving?'Saving...':'Save gear'} onPress={()=>void save()} disabled={saving||busy||!!preview}/>
  {id?<Button secondary title="Remove item" onPress={()=>void remove()} disabled={saving||busy}/>:null}
 </Page>;
}
