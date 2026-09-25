const KEY='hunteros.feedback.v1';
export async function readFeedbackSaved():Promise<string|null>{return typeof window==='undefined'?null:window.localStorage.getItem(KEY);}
export async function writeFeedbackSaved(json:string){window.localStorage.setItem(KEY,json);}
