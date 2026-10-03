// Pin the connection to a validated public IP. TLS still verifies the original hostname.
// No cookies, caller authorization or arbitrary headers are sent to product websites.
export interface PublicSocket {read(bytes:Uint8Array):Promise<number|null>;write(bytes:Uint8Array):Promise<number>;close():void;}
export type OpenPublicSocket=(address:string,hostname:string,https:boolean)=>Promise<PublicSocket>;
async function openSocket(address:string,hostname:string,https:boolean):Promise<PublicSocket> {
 if(typeof Deno==='undefined')throw Error('The server network runtime is unavailable.');
 const conn=await Deno.connect({hostname:address,port:https?443:80,transport:'tcp'});
 if(!https)return conn;
 try{return await Deno.startTls(conn,{hostname,alpnProtocols:['http/1.1']});}catch(e){conn.close();throw e;}
}
function decodeChunks(bytes:Uint8Array):Uint8Array {
 const out:Uint8Array[]=[];let at=0,total=0,complete=false;
 while(at<bytes.length){let end=at;while(end+1<bytes.length&&!(bytes[end]===13&&bytes[end+1]===10))end++;
  if(end+1>=bytes.length)throw Error('Incomplete product page response.');
  const line=new TextDecoder().decode(bytes.subarray(at,end)).split(';')[0];if(!/^[0-9a-f]{1,8}$/i.test(line))throw Error('Invalid product response encoding.');
  const size=parseInt(line,16);at=end+2;if(!size){const trailer=new TextDecoder().decode(bytes.subarray(at));if(trailer!=='\r\n'&&!/^(?:[^\r\n]+\r\n)*\r\n$/.test(trailer))throw Error('Incomplete product page response.');if(trailer.length>16384)throw Error('Product response headers are too large.');complete=true;break;}
  if(at+size+2>bytes.length||bytes[at+size]!==13||bytes[at+size+1]!==10)throw Error('Incomplete product page response.');
  out.push(bytes.subarray(at,at+size));total+=size;if(total>4000000)throw Error('Product page is too large to import.');at+=size+2;
 }
 if(!complete)throw Error('Incomplete product page response.');
 const result=new Uint8Array(total);let offset=0;for(const b of out){result.set(b,offset);offset+=b.length;}return result;
}
export async function pinnedPageRequest(target:URL,addresses:string[],signal:AbortSignal,open:OpenPublicSocket=openSocket):Promise<Response> {
 const socket=await open(addresses[0],target.hostname,target.protocol==='https:');
 let closed=false;const close=()=>{if(!closed){closed=true;socket.close();}};
 signal.addEventListener('abort',close,{once:true});
 try{
  if(signal.aborted)throw Error('Product lookup timed out.');
  const outgoing=new TextEncoder().encode('GET '+target.pathname+target.search+' HTTP/1.1\r\nHost: '+target.hostname+'\r\nAccept: text/html\r\nAccept-Encoding: identity\r\nUser-Agent: HunterOS/0.7 product-details-reference\r\nConnection: close\r\n\r\n');
  let written=0;while(written<outgoing.length){const n=await socket.write(outgoing.subarray(written));if(!n)throw Error('Product lookup connection closed.');written+=n;}
  const chunks:Uint8Array[]=[];let total=0,headerEnd=-1;
  while(true){const buffer=new Uint8Array(16384),n=await socket.read(buffer);if(n===null)break;if(n===0)throw Error('Empty product response.');chunks.push(buffer.slice(0,n));total+=n;if(total>4020000)throw Error('Product page is too large to import.');
   if(headerEnd<0){const first=new Uint8Array(total);let offset=0;for(const b of chunks){first.set(b,offset);offset+=b.length;}for(let i=0;i+3<first.length;i++)if(first[i]===13&&first[i+1]===10&&first[i+2]===13&&first[i+3]===10){headerEnd=i+4;break;}if(headerEnd<0&&total>16384)throw Error('Product response headers are too large.');}
  }
  if(headerEnd<0)throw Error('Incomplete product response headers.');if(headerEnd>16384)throw Error('Product response headers are too large.');
  const bytes=new Uint8Array(total);let offset=0;for(const b of chunks){bytes.set(b,offset);offset+=b.length;}
  const lines=new TextDecoder().decode(bytes.subarray(0,headerEnd-4)).split('\r\n'),status=/^HTTP\/1\.[01] (\d{3})\b/.exec(lines.shift()||'');if(!status)throw Error('Invalid product response.');
  const headers=new Headers();for(const line of lines){const colon=line.indexOf(':');if(colon<1)throw Error('Invalid product response header.');const key=line.slice(0,colon).toLowerCase();if(headers.has(key)&&['content-length','transfer-encoding','location'].includes(key))throw Error('Ambiguous product response.');headers.append(key,line.slice(colon+1).trim());}
  let body:Uint8Array<ArrayBuffer>=bytes.subarray(headerEnd);const transfer=headers.get('transfer-encoding');if(transfer){if(headers.has('content-length'))throw Error('Ambiguous product response.');if(transfer.toLowerCase()!=='chunked')throw Error('Unsupported product response encoding.');body=decodeChunks(body) as Uint8Array<ArrayBuffer>;}else if(headers.has('content-length')&&(!/^\d+$/.test(headers.get('content-length')!)||Number(headers.get('content-length'))!==body.length))throw Error('Incomplete product page response.');
  const encoding=headers.get('content-encoding');if(encoding&&encoding!=='identity'){
   if(!['gzip','deflate'].includes(encoding))throw Error('This site uses an unsupported page encoding. Enter its details manually.');
   const stream=new Response(body).body!.pipeThrough(new DecompressionStream(encoding as 'gzip'|'deflate')),reader=stream.getReader(),parts:Uint8Array[]=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000)throw Error('Product page is too large to import.');parts.push(value);}}finally{void reader.cancel().catch(()=>{});}
   body=new Uint8Array(size);let at=0;for(const part of parts){body.set(part,at);at+=part.length;}headers.delete('content-encoding');
  }
  headers.delete('content-length');headers.delete('transfer-encoding');
  const code=Number(status[1]);return new Response([204,205,304].includes(code)?null:body,{status:code,headers});
 }finally{signal.removeEventListener('abort',close);close();}
}
