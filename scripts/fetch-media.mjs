import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const output=path.resolve(process.argv[2]||'_site');
const origin='https://zhang-chengzhi-portfolio.chengzhi2287147617.chatgpt.site';
const portfolio=JSON.parse(fs.readFileSync(path.join(output,'portfolio.json'),'utf8'));
const refs=new Set();
for(const work of portfolio.works){
 for(const value of [work.src,work.poster,...(work.gallery||[])]){
  if(typeof value==='string'&&value.replace(/^\.\//,'/').startsWith('/media/'))refs.add(value.replace(/^\.\//,''));
 }
}
const pending=[...refs].filter(file=>!fs.existsSync(path.join(output,file)));
let cursor=0;
async function download(file){
 const target=path.join(output,file); fs.mkdirSync(path.dirname(target),{recursive:true});
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(`${origin}/${file}`,{headers:{'user-agent':'zhang-chengzhi-pages-builder'}});
   if(!response.ok||!response.body)throw Error(`HTTP ${response.status}`);
   await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(target));
   if(fs.statSync(target).size===0)throw Error('empty file');
   return;
  }catch(error){
   if(fs.existsSync(target))fs.rmSync(target,{force:true});
   if(attempt===3)throw new Error(`${file}: ${error.message}`);
  }
 }
}
async function worker(){while(cursor<pending.length){const file=pending[cursor++];console.log(`download ${cursor}/${pending.length} ${file}`);await download(file);}}
await Promise.all(Array.from({length:Math.min(6,pending.length)},worker));
const missing=[...refs].filter(file=>!fs.existsSync(path.join(output,file)));
if(missing.length)throw Error(`Missing media: ${missing.join(', ')}`);
console.log(`Verified ${refs.size} media references; downloaded ${pending.length}.`);
