// Shared type contract kept inside the standalone Edge Function deployment bundle.
// Mobile code imports this type without executing any server module.
export interface ProductFacts {
 manufacturer:string;seller:string;parentCompany:string;
 weightBasis:'product'|'net'|'pack'|'unknown';
 servingCount:number|null;servingSize:string;packSize?:string;servingBasis?:string;
 nutrition:{name:string;value:string}[];ingredients:string;allergens:string;
 identityEvidence:'page-stated'|'unknown';
}
