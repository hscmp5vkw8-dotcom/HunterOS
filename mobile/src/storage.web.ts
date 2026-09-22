const KEY='hunteros.mobile.v1';
export async function readSaved():Promise<string|null>{return typeof window==='undefined'?null:window.localStorage.getItem(KEY);}
export async function writeSaved(json:string){window.localStorage.setItem(KEY,json);}
