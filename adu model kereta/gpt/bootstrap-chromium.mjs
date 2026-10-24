#!/usr/bin/env node
/** Optional Linux-x64 browser fallback, not part of the animation runtime. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {brotliDecompressSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
if(process.platform!=='linux'||process.arch!=='x64')throw new Error('Fallback ini untuk Linux x64. Gunakan npx playwright install chromium pada OS lain.');
let entry;
try{entry=require.resolve('@sparticuz/chromium');}
catch{throw new Error('Jalankan npm install --no-save @sparticuz/chromium@138.0.2 terlebih dahulu.');}
let packageRoot=path.dirname(entry);
for(let i=0;i<5;i++){
  try{await fs.access(path.join(packageRoot,'bin','chromium.br'));break;}
  catch{packageRoot=path.dirname(packageRoot);}
}
const out=path.join(path.dirname(fileURLToPath(import.meta.url)),'.chromium');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'chromium'),brotliDecompressSync(await fs.readFile(path.join(packageRoot,'bin','chromium.br'))),{mode:0o755});
await fs.chmod(path.join(out,'chromium'),0o755);
const archive=path.join(out,'swiftshader.tar');
await fs.writeFile(archive,brotliDecompressSync(await fs.readFile(path.join(packageRoot,'bin','swiftshader.tar.br'))));
const unpack=spawnSync('tar',['--no-same-owner','-xf',archive,'-C',out],{stdio:'inherit'});
if(unpack.status!==0)throw new Error('Ekstraksi pustaka Chromium gagal.');
await fs.unlink(archive);
console.log('Chromium siap. Jalankan:');
console.log('CHROMIUM_EXECUTABLE="$PWD/.chromium/chromium" npm run render');
