import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {isIP} from 'node:net';

export function isPublicAddress(address){
 if(isIP(address)===4){const [a,b,c]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));}
 if(isIP(address)===6){const a=address.toLowerCase();return /^[23][0-9a-f]{3}:/.test(a)&&!a.startsWith('2001:db8:')&&!a.startsWith('2002:');}return false;
}
export function publicURL(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||url.hostname==='localhost'||url.hostname.endsWith('.local')||isIP(url.hostname.replace(/^\[|\]$/g,''))&&!isPublicAddress(url.hostname.replace(/^\[|\]$/g,'')))throw Error('Nguồn phải là URL HTTPS công khai.');url.hash='';return url;}
export async function fetchPublicPage(value,{resolve=lookup,transport=request,depth=0}={}){
 const url=publicURL(value);if(depth>3)throw Error('Nguồn chuyển hướng quá nhiều.');
 let timer;const addresses=await Promise.race([resolve(url.hostname,{all:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Không phân giải được nguồn.')),10000);})]).finally(()=>clearTimeout(timer));
 if(!addresses.length||addresses.some(x=>!isPublicAddress(x.address)))throw Error('Địa chỉ nguồn không công khai.');
 const response=await new Promise((resolve,reject)=>{
  const req=transport(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'TichStudioResearch/1.0','Accept':'text/html,text/plain;q=0.9','Accept-Encoding':'identity'},lookup:(_host,options,cb)=>options.all?cb(null,addresses):cb(null,addresses[0].address,addresses[0].family)},res=>{
   if([301,302,303,307,308].includes(res.statusCode)){res.resume();resolve({redirect:res.headers.location});return;}
   if(res.statusCode!==200){res.resume();reject(Error('Nguồn không cho đọc (HTTP '+res.statusCode+').'));return;}
   if(!/text\/(html|plain)/i.test(res.headers['content-type']||'')){res.resume();reject(Error('Nguồn không phải trang text/HTML.'));return;}
   let bytes=0;const parts=[];res.on('data',chunk=>{bytes+=chunk.length;if(bytes>3*1024*1024){res.destroy(Error('Trang nguồn quá lớn.'));return;}parts.push(chunk);});res.on('error',reject);res.on('end',()=>resolve({html:Buffer.concat(parts).toString('utf8'),url:url.href}));
  });req.on('error',reject);req.end();
 });
 if(response.redirect)return fetchPublicPage(new URL(response.redirect,url).href,{resolve,transport,depth:depth+1});return response;
}
export function extractSource(html,topic=''){
 const decode=s=>s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):' ';}).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
 const title=decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'Nguồn web').replace(/<[^>]+>/g,'').trim().slice(0,200);
 let body=html.replace(/<(script|style|noscript|svg|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ');
 body=body.match(/<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1]||body;
 body=decode(body.replace(/<\/(?:p|div|section|h[1-6]|li|tr)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t\r]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
 if(body.length<400||/just a moment|verify you are human|access denied/i.test(title))throw Error('Chưa đọc được nội dung hữu ích của trang.');
 const rows=body.split('\n').map(s=>s.trim()).filter(s=>s.length>=40),terms=new Set(topic.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[]);
 const ranked=rows.map((text,index)=>({text,index,score:(index<3?3:0)+[...terms].filter(t=>text.toLowerCase().includes(t)).length})).sort((a,b)=>b.score-a.score||a.index-b.index);
 let size=0;const selected=[];for(const row of ranked){if(size+row.text.length>10000)continue;selected.push(row);size+=row.text.length;if(size>8500)break;}
 const text=(selected.length?selected.sort((a,b)=>a.index-b.index).map(x=>x.text).join('\n'):body.slice(0,10000));
 return {title,text,excerpt:true};
}
