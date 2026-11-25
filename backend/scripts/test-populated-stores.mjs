/** Read-only ownership matrix: Shalla + existing User2 + existing User3. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {runMatrix} from './test-three-stores.mjs';
import {requiredEnv} from '../src/server/config.ts';

export function selectShalla(credentials){
 const matches=Object.entries(credentials).filter(([,v])=>v?.seller==='Shalla');
 if(matches.length!==1)throw Error('Expected exactly one Shalla credential entry');
 const [email,value]=matches[0];
 if(!email.endsWith('@sellens.test')||typeof value.password!=='string'||value.password.length<12)throw Error('Invalid Shalla credential entry');
 return {email,password:value.password};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let report={result:'FAIL',mode:'business-read-only',shops:['Shalla','Gentlemen (User2)','Gia Dung (User3)']};
 try{
  if(process.argv.length!==2)throw Error('This read-only runner accepts no options');
  const secrets=JSON.parse(await readFile(new URL('../.env.seller-accounts.json',import.meta.url),'utf8'));
  const users=[selectShalla(secrets),...[2,3].map(i=>({email:requiredEnv(`SEED_USER${i}_EMAIL`),password:requiredEnv(`SEED_USER${i}_PASSWORD`)}))];
  requiredEnv('SEED_ADMIN_EMAIL');requiredEnv('SEED_ADMIN_PASSWORD');
  const labels=['Shalla','User2 (Gentlemen)','User3 (Gia Dung)'];
  report=runMatrix(users,(left,right,i,j)=>{
   console.error(`Checking ${labels[i]} against ${labels[j]}...`);
   const child=spawnSync(process.execPath,['--import','tsx',fileURLToPath(new URL('./test-store-http.ts',import.meta.url))],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',shell:false,timeout:300000,maxBuffer:8*1024*1024,
    env:{...process.env,SEED_USER1_EMAIL:left.email,SEED_USER1_PASSWORD:left.password,SEED_USER2_EMAIL:right.email,SEED_USER2_PASSWORD:right.password},
   });
   if(child.status!==0){
    // The supplied ownership test logs endpoint names and sanitized errors only.
    if(child.stderr)console.error(child.stderr.trim());
    throw Error(`Pair ${labels[i]} / ${labels[j]} failed; inspect tmp/store-http-results.json`);
   }
   let parsed;try{parsed=JSON.parse(child.stdout.trim());}catch{throw Error('Cannot parse pair report; keep test-store-http.ts JSON output unchanged');}
   if(i===0&&String(parsed.user1?.store_id)==='3')throw Error('Shalla unexpectedly resolved to legacy J4F store');
   return parsed;
  });
  report.shops=labels;
  console.log(JSON.stringify(report,null,2));
 }catch(e){
  const message=e?.message??'';
  console.error(/^(Missing environment variable:|Expected exactly|Invalid Shalla|This read-only|Pair |Cannot parse|Shalla unexpectedly)/.test(message)?message:'Populated-store test stopped; check local credential file, pair report and backend connectivity.');
  process.exitCode=1;
 }finally{
  try{await mkdir(new URL('../../tmp/',import.meta.url),{recursive:true});await writeFile(new URL('../../tmp/populated-store-http-results.json',import.meta.url),JSON.stringify(report,null,2));}catch{console.error('Could not write populated-store report');process.exitCode=1;}
 }
}
