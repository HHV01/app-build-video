import test from 'node:test';
import assert from 'node:assert/strict';
import { copyWithFallback } from './public/clipboard.mjs';
import {readFile} from 'node:fs/promises';
test('clipboard denial uses fallback without losing prompt',async()=>{
 let text;const result=await copyWithFallback('FULL PROMPT',{writeText:async()=>{throw Error('permission denied');},legacyCopy:t=>{text=t;return true;}});assert.equal(result,true);assert.equal(text,'FULL PROMPT');
});

test('K5 real copy handler presents selected text and Vietnamese manual fallback when both methods fail',async()=>{
 const source=await readFile('studio/public/app.js','utf8'),start=source.indexOf('async function copy(text)'),end=source.indexOf('\nfunction heading(',start),created=[];let commands=0,downloaded;
 const document={activeElement:{focus(){}},body:{append(){}},execCommand(){commands++;return false;},createElement(tag){const node={tag,style:{},children:[],append(...nodes){this.children.push(...nodes);},setAttribute(){},focus(){},select(){this.selected=true;},remove(){this.removed=true;},addEventListener(){},showModal(){this.open=true;},close(){}};created.push(node);return node;}};
 const copy=new Function('copyWithFallback','navigator','document','toast','download',source.slice(start,end)+';return copy;')(copyWithFallback,{clipboard:{writeText:async()=>{throw Error('denied');}}},document,()=>{},(name,text)=>{downloaded={name,text};});
 await copy('FULL image_prompt + animation_prompt');assert.equal(commands,1);assert(created.find(n=>n.tag==='textarea').removed);const dialog=created.find(n=>n.tag==='dialog');assert(dialog.open);assert(created.find(n=>n.tag==='p').textContent.includes('Ctrl+C'));assert(created.find(n=>n.tag==='p').textContent.includes('Trình duyệt chặn clipboard'));const box=created.filter(n=>n.tag==='textarea').at(-1);assert(box.selected);assert.equal(box.value,'FULL image_prompt + animation_prompt');created.find(n=>n.tag==='button'&&n.textContent==='Tải prompt TXT').onclick();assert.equal(downloaded.text,box.value);
});
test('both copy methods blocked return false for manual selection; success skips fallback',async()=>{
 assert.equal(await copyWithFallback('text',{writeText:async()=>{throw Error('denied');},legacyCopy:()=>false}),false);
 assert.equal(await copyWithFallback('text',{writeText:async()=>{},legacyCopy:()=>{throw Error('not needed');}}),true);
});
