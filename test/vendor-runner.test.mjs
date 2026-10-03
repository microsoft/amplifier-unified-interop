import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('vendor discovery defaults to no prompts and refuses overwriting a prior receipt',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'acp-vendor-runner-')),output=join(directory,'receipt.json'),log=join(directory,'agent.jsonl');
 const fixture=fileURLToPath(new URL('../fixtures/acp-agent.mjs',import.meta.url)),runner=fileURLToPath(new URL('./vendor-qualification.mjs',import.meta.url));
 const config=join(directory,'config.json'),env={...process.env};delete env.UNIFIED_HOST_MODULE;
 try{
  await writeFile(config,JSON.stringify({adapters:[{id:'independent-fixture',package:{name:'fixture',version:'1'},command:process.execPath,args:[fixture],artifact:fixture,stateDirectory:join(directory,'state'),env:{FIXTURE_LOG:log}}]}));
  const run=spawnSync(process.execPath,[runner,config,output],{encoding:'utf8',env,timeout:10000});assert.equal(run.status,0,run.stderr);
  const receipt=JSON.parse(await readFile(output,'utf8'));assert.equal(receipt.adapters[0].direct.sessionStatus,'created');assert.equal(receipt.adapters[0].direct.promptCalls,0);assert.equal(receipt.adapters[0].accountTurn.status,'skipped');
  const before=await readFile(output),audit=await readFile(log,'utf8');assert.equal(audit.trim().split('\n').map(JSON.parse).filter(x=>x.method==='session/prompt').length,0);
  const repeated=spawnSync(process.execPath,[runner,config,output],{encoding:'utf8',env,timeout:10000});assert.notEqual(repeated.status,0);assert.deepEqual(await readFile(output),before);assert.equal(await readFile(log,'utf8'),audit);
 }finally{await rm(directory,{recursive:true,force:true});}
});
