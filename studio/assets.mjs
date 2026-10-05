import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const types = {png:'image/png',jpg:'image/jpeg',webp:'image/webp',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',ogg:'audio/ogg',webm:'audio/webm',aac:'audio/aac',flac:'audio/flac'};
const extensions = Object.fromEntries(Object.entries(types).map(([ext,mime])=>[mime,ext]));
Object.assign(extensions, {'audio/mp3':'mp3','audio/x-wav':'wav','audio/m4a':'m4a','audio/x-m4a':'m4a'});
const fields = new Set(['image','voiceData','musicData','thumbnailImage','characterRef']);
const fail = (message,status=422)=>Object.assign(new Error(message),{status});

export function createAssetStore(root) {
  function info(url) {
    const match=String(url).match(/^\/api\/assets\/([a-f0-9]{64})\.(png|jpg|webp|mp3|wav|m4a|ogg|webm|aac|flac)$/);
    if(!match)throw fail('Mã file không hợp lệ.',400);
    return {file:path.join(root,`${match[1]}.${match[2]}`),mime:types[match[2]]};
  }
  function read(url,prefix='data:') {
    const asset=info(url);
    if(!`data:${asset.mime}`.startsWith(prefix))throw fail('Loại file không phù hợp.');
    try{return {...asset,bytes:readFileSync(asset.file)};}catch(e){if(e.code==='ENOENT')throw fail('File media không còn trên máy.',404);throw e;}
  }
  async function put(data) {
    const match=String(data).match(/^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/);
    if(!match||!extensions[match[1]])throw fail('Chỉ lưu ảnh PNG/JPEG/WebP hoặc file âm thanh hỗ trợ.');
    const bytes=Buffer.from(match[2],'base64');
    if(!bytes.length||bytes.length>10*1024*1024)throw fail('File rỗng hoặc vượt 10 MB.',413);
    if(bytes.toString('base64').replace(/=+$/,'')!==match[2].replace(/=+$/,''))throw fail('Base64 không hợp lệ.');
    const ext=extensions[match[1]],name=`${createHash('sha256').update(bytes).digest('hex')}.${ext}`;
    await mkdir(root,{recursive:true});
    try{await writeFile(path.join(root,name),bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
    return {url:`/api/assets/${name}`,mime:types[ext],bytes:bytes.length};
  }
  async function externalize(value) {
    const refs=[];
    async function walk(object,keys=[]) {
      if(!object||typeof object!=='object')return;
      for(const [key,item] of Object.entries(object)) {
        const at=[...keys,key];
        if(fields.has(key)&&typeof item==='string'&&item.startsWith('data:')){const result=await put(item);object[key]=result.url;refs.push({path:at,url:result.url});}
        else if(fields.has(key)&&typeof item==='string'&&item.startsWith('/api/assets/'))read(item);
        else if(item&&typeof item==='object')await walk(item,at);
      }
    }
    await walk(value);return refs;
  }
  return {put,read,info,externalize};
}
