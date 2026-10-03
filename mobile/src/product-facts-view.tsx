import { Text } from 'react-native';
import type { ProductFacts } from './types';
import { s } from './ui';
export function ProductFactsView({facts}:{facts:ProductFacts}) {
 return <><Text selectable style={s.body}>Manufacturer: {facts.manufacturer||'Unknown - needs review'}{'\n'}Seller / site: {facts.seller||'Unknown'}{'\n'}Parent company: {facts.parentCompany||'Unknown'}{'\n'}Identity evidence: {facts.identityEvidence==='page-stated'?'Page-stated; legal identity not verified':'Unknown - needs review'}{'\n'}Weight basis: {facts.weightBasis}</Text>
 {(facts.packSize||facts.servingBasis||facts.servingCount!==null||facts.servingSize||facts.nutrition.length||facts.ingredients||facts.allergens)?<><Text selectable style={s.body}>Pack size: {facts.packSize||'Not provided'}{'\n'}Source servings: {facts.servingCount??'Not provided'}{'\n'}Serving basis: {facts.servingBasis||'Not specified'}{'\n'}Serving size: {facts.servingSize||'Not provided'}{facts.nutrition.map(n=>'\n'+n.name+': '+n.value).join('')}{'\n'}Ingredients: {facts.ingredients||'Not provided'}{'\n'}Allergens: {facts.allergens||'Not provided'}</Text><Text style={s.small}>Nutrition is quoted as stated on the page. Serving and package quantities may differ. Missing allergen information does not mean allergen-free. Confirm the label for your exact pack size.</Text></>:null}</>;
}
