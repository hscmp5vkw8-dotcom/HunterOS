import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=path.resolve(root,'.'+pathname);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return;}let file=target,data;try{data=await readFile(file);}catch{file=path.join(root,'index.html');data=await readFile(file);}const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.ttf':'font/ttf','.css':'text/css','.svg':'image/svg+xml'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(500).end('Error');}}).listen(4173,'127.0.0.1');
