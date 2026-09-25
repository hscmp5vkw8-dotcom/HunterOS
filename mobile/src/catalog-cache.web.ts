const key='hunteros.public-catalog.v1';
export async function readCatalogCache(){return typeof window==='undefined'?null:window.localStorage.getItem(key);}
export async function writeCatalogCache(json:string){window.localStorage.setItem(key,json);}
