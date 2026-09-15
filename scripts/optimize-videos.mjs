import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const media=path.resolve(process.argv[2]||'_site','media');
const files=fs.readdirSync(media).filter(name=>name.endsWith('.mp4')&&fs.statSync(path.join(media,name)).size>2.5*1024*1024);
let cursor=0,before=0,after=0;
function encode(file){return new Promise((resolve,reject)=>{
 const input=path.join(media,file),output=path.join(media,`${file}.optimized.mp4`);before+=fs.statSync(input).size;
 const args=['-hide_banner','-loglevel','error','-y','-i',input,'-map','0:v:0','-map','0:a?','-vf','scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-preset','veryfast','-crf','28','-maxrate','900k','-bufsize','1800k','-pix_fmt','yuv420p','-profile:v','main','-c:a','aac','-b:a','64k','-movflags','+faststart',output];
 const child=spawn('ffmpeg',args,{stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',data=>error+=data);
 child.on('error',reject);child.on('close',code=>{if(code)return reject(new Error(`${file}: ${error}`));const original=fs.statSync(input).size,optimized=fs.statSync(output).size;if(optimized<original){fs.renameSync(output,input);after+=optimized;}else{fs.rmSync(output);after+=original;}console.log(`optimized ${file}: ${(original/1048576).toFixed(1)} MB -> ${(Math.min(original,optimized)/1048576).toFixed(1)} MB`);resolve();});
 });}
async function worker(){while(cursor<files.length)await encode(files[cursor++]);}
await Promise.all(Array.from({length:Math.min(2,files.length)},worker));
console.log(`Optimized ${files.length} videos: ${(before/1048576).toFixed(1)} MB -> ${(after/1048576).toFixed(1)} MB.`);
