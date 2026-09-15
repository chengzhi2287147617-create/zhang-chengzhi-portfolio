import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const output=path.resolve(process.argv[2]||'_site');
const origin='https://zhang-chengzhi-portfolio.chengzhi2287147617.chatgpt.site';
const published='https://chengzhi2287147617-create.github.io/zhang-chengzhi-portfolio';
const committed=JSON.parse(fs.readFileSync(path.join(output,'portfolio.json'),'utf8'));
let portfolio=committed;
try{
 const response=await fetch(`${origin}/api/portfolio`,{headers:{'user-agent':'zhang-chengzhi-pages-builder'}});
 if(!response.ok)throw Error(`HTTP ${response.status}`);
 const live=await response.json();
 if(!Array.isArray(live.works))throw Error('invalid portfolio response');
 const ids=new Set(live.works.map(work=>work.id));
 portfolio={...live,works:[...live.works,...committed.works.filter(work=>work.id.startsWith('ui')&&!ids.has(work.id))]};
 console.log(`Loaded ${live.works.length} managed works and merged ${portfolio.works.length-live.works.length} local UI works.`);
}catch(error){console.warn(`Managed portfolio unavailable; using committed snapshot: ${error.message}`);}
for(const work of portfolio.works){
 for(const key of ['src','poster'])if(typeof work[key]==='string'&&work[key].startsWith('/'))work[key]='.'+work[key];
 if(Array.isArray(work.gallery))work.gallery=work.gallery.map(item=>typeof item==='string'&&item.startsWith('/')?'.'+item:item);
}
fs.writeFileSync(path.join(output,'portfolio.json'),JSON.stringify(portfolio));
const refs=new Set();
for(const work of portfolio.works){
 for(const value of [work.src,work.poster,...(work.gallery||[])]){
    if(typeof value==='string'){
   const file=value.startsWith('./')?value.slice(2):value.startsWith('/')?value.slice(1):value;
   if(file.startsWith('media/')||file.startsWith('uploads/'))refs.add(file);
  }
 }
}
const pending=[...refs].filter(file=>!fs.existsSync(path.join(output,file)));
let cursor=0;
async function download(file){
 const target=path.join(output,file); fs.mkdirSync(path.dirname(target),{recursive:true});
 let lastError;
 for(const base of [origin,published])for(let attempt=1;attempt<=2;attempt++)try{
  const response=await fetch(`${base}/${file}`,{headers:{'user-agent':'zhang-chengzhi-pages-builder'}});
  if(!response.ok||!response.body)throw Error(`HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(target));
  if(fs.statSync(target).size===0)throw Error('empty file');
  return;
 }catch(error){lastError=error;if(fs.existsSync(target))fs.rmSync(target,{force:true});}
 throw new Error(`${file}: ${lastError?.message||'download failed'}`);
}
async function worker(){while(cursor<pending.length){const file=pending[cursor++];console.log(`download ${cursor}/${pending.length} ${file}`);await download(file);}}
await Promise.all(Array.from({length:Math.min(6,pending.length)},worker));
const missing=[...refs].filter(file=>!fs.existsSync(path.join(output,file)));
if(missing.length)throw Error(`Missing media: ${missing.join(', ')}`);
console.log(`Verified ${refs.size} media references; downloaded ${pending.length}.`);
