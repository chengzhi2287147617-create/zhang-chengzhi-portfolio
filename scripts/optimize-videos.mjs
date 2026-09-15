import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const media=path.resolve(process.argv[2]||'_site','media');
const files=fs.readdirSync(media).filter(name=>name.endsWith('.mp4'));
let cursor=0,total=0;
function prepare(file){return new Promise((resolve,reject)=>{
 const input=path.join(media,file),output=path.join(media,`${file}.faststart.mp4`);
 const args=['-hide_banner','-loglevel','error','-y','-i',input,'-map','0','-c','copy','-movflags','+faststart',output];
 const child=spawn('ffmpeg',args,{stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',data=>error+=data);
 child.on('error',reject);child.on('close',code=>{if(code)return reject(new Error(`${file}: ${error}`));total+=fs.statSync(output).size;fs.renameSync(output,input);console.log(`prepared ${file} without re-encoding`);resolve();});
 });}
async function worker(){while(cursor<files.length)await prepare(files[cursor++]);}
await Promise.all(Array.from({length:Math.min(4,files.length)},worker));
console.log(`Prepared ${files.length} original-quality videos (${(total/1048576).toFixed(1)} MB) for progressive playback.`);
