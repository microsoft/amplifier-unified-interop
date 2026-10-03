/** Actual installed native ACP reader, with impossible runtime command and I/O audit. */
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {Peer} from './wire.mjs';
const {UNIFIED_HOST_MODULE:modulePath,CATALOG_PYTHON:catalogPython,NATIVE_ACP_PYTHON:nativePython}=process.env;
if(!modulePath||!catalogPython||!nativePython)throw Error('Installed host, catalog and native interpreter paths required');
const {createHost,StdioCatalog}=await import(modulePath),fixture=name=>fileURLToPath(new URL('../fixtures/'+name,import.meta.url));
const directory=await mkdtemp(join(tmpdir(),'unified-cold-native-'));let host,peer;
try{
 const seeded=spawnSync(catalogPython,['-I',fixture('cold-native-history.py'),'seed',directory],{encoding:'utf8'});assert.equal(seeded.status,0,seeded.stderr);const seed=JSON.parse(seeded.stdout);
 const log=join(directory,'native-io.jsonl'),audit=async()=>{try{return (await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);}catch(error){if(error.code==='ENOENT')return [];throw error;}};
 const catalog=new StdioCatalog({command:catalogPython,args:['-I',fixture('audited-catalog.py'),'serve','--db',join(directory,'catalog.sqlite'),'--scan-interval','0','--workspace-check-interval','0']});
 host=await createHost({stateDirectory:join(directory,'host'),allowedWorkspaceRoots:[seed.workspace],catalog,port:0,engines:[{id:'amplifier',command:nativePython,args:['-I',fixture('cold-native-history.py'),'audit','amplifier-acp','--config',seed.config],env:{NATIVE_IO_LOG:log}}]});
 peer=await Peer.open(host.url);await peer.request('initialize',{channel:'ahp-root://',clientId:randomUUID(),protocolVersions:['0.9.0'],initialSubscriptions:['ahp-root://']});
 const roots=await peer.request('listSessions',{channel:'ahp-root://',limit:50});assert.equal(roots.items.length,1);assert.equal(roots.items[0].resource,seed.session);
 await peer.request('subscribe',{channel:seed.session});assert.equal((await audit()).length,0);assert.equal(host.diagnostics().activeAgents,0);
 const chat=seed.session.replace('ahp-session:','ahp-chat:');const snapshot=await peer.request('subscribe',{channel:chat,view:{turns:50}});assert.equal(snapshot.snapshot.state.turns.length,50);assert.equal(snapshot.snapshot.state.turns[0].id,'turn-9950');
 const afterPage=await audit(),bytes=afterPage.filter(row=>row.event==='transcript-read').reduce((sum,row)=>sum+row.bytes,0);assert.ok(bytes>0&&bytes<seed.transcriptBytes/10);assert.equal(host.diagnostics().activeAgents,0);
 let cursor,children=0,pages=0;
 do{const page=await catalog.list({connectionId:'explicit-child-reader',parentUri:seed.session,limit:25,...(cursor?{cursor}:{}),allowedWorkspaceRoots:[seed.workspace]});assert.ok(page.items.length<=25);assert.ok(page.items.every(item=>item.parentUri===seed.session));children+=page.items.length;pages++;cursor=page.nextCursor;}while(cursor);
 assert.equal(children,700);assert.equal(pages,28);assert.equal((await audit()).length,afterPage.length);
 for(let i=0;i<20;i++)await peer.request('listSessions',{channel:'ahp-root://',limit:50});assert.equal((await audit()).length,afterPage.length);
 await peer.request('unsubscribe',{channel:chat});assert.equal(host.diagnostics().workingSet.selectedNativeTurnIds,0);
 const hashes={};for(const name of Object.keys(seed.hashes))hashes[name]=createHash('sha256').update(await readFile(join(seed.directory,name))).digest('hex');assert.deepEqual(hashes,seed.hashes);
 assert.equal(afterPage.filter(row=>row.event.startsWith('forbidden')).length,0);assert.deepEqual(peer.failures,[]);
 const receipt={scope:'Installed native ACP passive reader over 10,000 canonical historical turns and 700 indexed delegated children. Worker launch is rejected by an independent audit hook and impossible workerCommand; no models/accounts.',nativeRevision:process.env.NATIVE_ACP_REVISION,hostRevision:process.env.UNIFIED_HOST_REVISION,transcriptBytes:seed.transcriptBytes,selectedTurns:50,transcriptBytesRead:bytes,transcriptOpens:afterPage.filter(row=>row.event==='transcript-open').length,nativeProcesses:afterPage.filter(row=>row.event==='native-process-start').length,executionAgents:0,children,childPages:pages,childPageLimit:25,unrelatedMetadataNativeReads:0,eventLogReads:0,historyHashesPreserved:true,diagnostics:host.diagnostics()};
 if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{peer?.close();peer?.socket.terminate();if(host)await host.close();await rm(directory,{recursive:true,force:true});}
