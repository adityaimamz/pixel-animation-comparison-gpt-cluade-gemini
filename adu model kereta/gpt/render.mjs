#!/usr/bin/env node
/** Frame-by-frame, deterministic Playwright/Chromium render. Node >= 20. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(root,'output');
const require=createRequire(import.meta.url);
let chromium;
try {({chromium}=require('playwright'));}
catch(e){
  // Optional fallback for a preinstalled Codex runtime; normal npm works first.
  const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if(!modules)throw new Error('Jalankan npm install, lalu npx playwright install chromium.');
  ({chromium}=require(path.join(modules,'playwright')));
}
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:root,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error(`${cmd} gagal (${r.status})`);}
function capture(cmd,args){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw new Error(r.stderr);return r.stdout;}
const sha=b=>createHash('sha256').update(b).digest('hex');
const onlyPreview=process.argv.includes('--preview');
await fs.mkdir(path.join(output,'frames'),{recursive:true});
await fs.mkdir(path.join(output,'qa'),{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-gpu']});
const browserVersion=browser.version();
const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.join(root,'animation.html')).href+'?render=1');
const meta=await page.evaluate(()=>window.filmInfo);
const sampleTimes=[2,6,10.8,14.8];
const deterministic=[];
try {
  for(let k=0;k<sampleTimes.length;k++){
    const t=sampleTimes[k];
    const bytes=Buffer.from(await page.evaluate(t=>window.exportFrame(t),t),'base64');
    await fs.writeFile(path.join(output,'qa',`scene-${k+1}.png`),bytes);
    // Re-render after a different time to catch stateful particles/PRNG bugs.
    await page.evaluate(()=>window.drawFrame(0.37));
    const repeated=Buffer.from(await page.evaluate(t=>window.exportFrame(t),t),'base64');
    if(!bytes.equals(repeated))throw new Error(`Frame tidak deterministik pada t=${t}`);
    deterministic.push({time:t,sha256:sha(bytes),repeat_identical:true});
  }
  if(!onlyPreview){
    for(let i=0;i<450;i++){
      const bytes=Buffer.from(await page.evaluate(t=>window.exportFrame(t),i/30),'base64');
      await fs.writeFile(path.join(output,'frames',String(i).padStart(4,'0')+'.png'),bytes);
      if(i%30===0||i===449)console.log(`Frame ${i+1}/450 · ${(i/30).toFixed(2)} s`);
    }
  }
  if(errors.length)throw new Error(errors.join('\n'));
} finally {await browser.close();}
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','1','-start_number','1','-i',path.join(output,'qa','scene-%d.png'),'-vf','scale=270:480:flags=neighbor,tile=4x1','-frames:v','1',path.join(output,'qa','four-scenes.png')]);
if(onlyPreview){console.log('Pratinjau selesai: output/qa/four-scenes.png');process.exit(0);}
run(process.env.PYTHON||'python3',[path.join(root,'audio.py'),'--output',path.join(output,'soundtrack.wav')]);
const mp4=path.join(output,'kereta-menuju-fajar.mp4');
run('ffmpeg',['-hide_banner','-loglevel','warning','-y','-thread_queue_size','128','-framerate','30','-start_number','0','-i',path.join(output,'frames','%04d.png'),'-i',path.join(output,'soundtrack.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','slow','-crf','12','-pix_fmt','yuv420p','-r','30','-frames:v','450','-c:a','aac','-b:a','192k','-ar','48000','-t','15','-movflags','+faststart','-metadata','title=Kereta Menuju Fajar',mp4]);
const probe=JSON.parse(capture('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',mp4]));
const video=probe.streams.find(x=>x.codec_type==='video');
const audio=probe.streams.find(x=>x.codec_type==='audio');
if(video.width!==1080||video.height!==1920||video.r_frame_rate!=='30/1'||+video.nb_read_frames!==450||Math.abs(+video.duration-15)>1e-6||Math.abs(+probe.format.duration-15)>1e-6||!audio||Math.abs(+audio.duration-15)>.001)throw new Error('Validasi metadata video/audio gagal.');
const report={...meta,renderer:'Playwright headless Chromium; Canvas 2D only',chromium_version:browserVersion,
  video:{width:video.width,height:video.height,frames:+video.nb_read_frames,fps:video.r_frame_rate,duration:+video.duration,pixel_format:video.pix_fmt},
  audio:{codec:audio.codec_name,sample_rate:+audio.sample_rate,channels:audio.channels,duration:+audio.duration},
  container_duration:+probe.format.duration,deterministic_samples:deterministic,browser_errors:errors,
  note:'PNG masters use exact 4x nearest-neighbor pixels; H.264/AAC are lossy delivery codecs.'};
await fs.writeFile(path.join(output,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Selesai: ${mp4}\n15.000 detik · 450 frame · 1080×1920 · 30 fps · stereo`);
