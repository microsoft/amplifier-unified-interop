/** Public installed components; synthetic setup is outside all measured work. */
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir,cpus,totalmem,platform,release} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {Peer} from './wire.mjs';

const hostModule=process.env.UNIFIED_HOST_MODULE,python=process.env.CATALOG_PYTHON,root='ahp-root://';
if(!hostModule||!python)throw Error('Provide an independently installed UNIFIED_HOST_MODULE and CATALOG_PYTHON');
const hostRevision=process.env.UNIFIED_HOST_REVISION,catalogRevision=process.env.CATALOG_REVISION,hostArtifact=process.env.UNIFIED_HOST_ARTIFACT;
if(!/^[a-f0-9]{40}$/.test(hostRevision??'')||!/^[a-f0-9]{40}$/.test(catalogRevision??'')||!hostArtifact)throw Error('Exact host/catalog source revisions and packaged host artifact are required for the receipt');
const summarise=values=>{const sorted=[...values].sort((a,b)=>a-b),at=p=>Math.round(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]*1000)/1000;return {samples:values.length,p50Ms:at(.5),p95Ms:at(.95),p99Ms:at(.99),maxMs:at(1)}};
const fixture=name=>fileURLToPath(new URL('../fixtures/'+name,import.meta.url));
const measure=async(fn,values)=>{const start=performance.now(),result=await fn();values.push(performance.now()-start);return result;};
const discoverableRoot=item=>/^ahp-session:\/catalog-[0-9]{8}$/.test(item.resource)&&Number(item.resource.split('-').at(-1))<1000;

async function probe(directory,count){
 const {createHost,StdioCatalog}=await import(hostModule),log=join(directory,'agent.jsonl');
 const catalog=new StdioCatalog({command:python,args:['-I',fixture('audited-catalog.py'),'serve','--db',join(directory,'catalog.sqlite'),'--scan-interval','0','--workspace-check-interval','0']});
 const host=await createHost({stateDirectory:join(directory,'host'),allowedWorkspaceRoots:[join(directory,'projects')],catalog,port:0,maxActiveAgents:8,maxClients:40,idleAgentMs:60000,replayLimit:512,
  engines:[{id:'fixture',command:process.execPath,args:[fixture('acp-agent.mjs')],env:{FIXTURE_LOG:log}}]});
 const peers=[],sessions=[],metadata=[],allViewers=[],convergence=[],lists=[];let maximumPageBytes=0,convergenceReads=0;
 try{
  for(let i=0;i<32;i++){
   const peer=await Peer.open(host.url);peer.clientId=randomUUID();await peer.request('initialize',{channel:root,clientId:peer.clientId,protocolVersions:['0.9.0'],initialSubscriptions:[root]});peers.push(peer);
  }
  const initial=await peers[0].request('listSessions',{channel:root,limit:50});assert.equal(initial.items.length,50);assert.ok(initial.items.every(discoverableRoot));assert.equal(host.diagnostics().activeAgents,0);
  await assert.rejects(readFile(log),/ENOENT/);
  for(let i=0;i<8;i++){
   const session='ahp-session:/'+randomUUID();await peers[i].request('createSession',{channel:session,provider:'fixture',workingDirectories:[pathToFileURL(join(directory,'projects','p-'+i)).href]});sessions.push(session);
  }
  for(let i=0;i<peers.length;i++)await peers[i].request('subscribe',{channel:sessions[i%8]});
  // Runs complete with no chat subscribers: losing a viewer is not cancellation.
  await Promise.all(sessions.map(async(session,i)=>{
   const id='owned-turn-'+i;await host.submitTurn(session,{commandId:id,clientId:'scale-fixture',text:'One fixed active turn'});
   assert.equal((await host.waitForTurn(session,id,10000)).status,'completed');
  }));
  assert.equal(host.diagnostics().activeAgents,8);
  global.gc?.();const before=process.memoryUsage();const cpu=process.cpuUsage();
  for(let round=0;round<20;round++){
   const roundStart=performance.now();
   await Promise.all(peers.map(async(peer,i)=>{
    if(i<8){
     const title=`Explicit title ${round}-${i}`,start=performance.now();
     const matches=event=>event.method==='action'&&event.params.channel===sessions[i]&&event.params.origin?.clientId===peer.clientId&&event.params.origin?.clientSeq===round&&event.params.action.type==='session/titleChanged'&&event.params.action.title===title;
     const confirmations=peers.filter((_,viewer)=>viewer%8===i).map(viewer=>viewer.wait(matches).then(event=>{assert.ok(!event.params.rejectionReason);if(viewer===peer)metadata.push(performance.now()-start);}));
     // AHP dispatchAction is a notification. The authoritative action echo,
     // including the initiating client and sequence, acknowledges acceptance.
     peer.dispatch(sessions[i],{type:'session/titleChanged',title},round);
     await Promise.all(confirmations);allViewers.push(performance.now()-start);
    }
    else{const page=await measure(()=>peer.request('listSessions',{channel:root,limit:50}),lists);assert.equal(page.items.length,50);maximumPageBytes=Math.max(maximumPageBytes,Buffer.byteLength(JSON.stringify(page)));}
   }));
   // The host emits actions before catalog synchronization. Measure the
   // read-visible catalog barrier separately; a UI echo is not a disk receipt.
   for(;;){
    const page=await peers[0].request('listSessions',{channel:root,limit:50});convergenceReads++;
    if(sessions.every((uri,i)=>page.items.some(item=>item.resource===uri&&item.title===`Explicit title ${round}-${i}`)))break;
    assert.ok(performance.now()-roundStart<10000,'Catalog did not converge');
    await new Promise(resolve=>setTimeout(resolve,5));
   }
   convergence.push(performance.now()-roundStart);
   // The harness itself must not retain an unbounded event history.
   for(const peer of peers)peer.events=[];
  }
  const first=await peers[0].request('listSessions',{channel:root,limit:50}),second=await peers[0].request('listSessions',{channel:root,limit:50,cursor:first.nextCursor});
  assert.equal(new Set([...first.items,...second.items].map(item=>item.resource)).size,100);
  assert.ok(second.items.every(discoverableRoot));
  for(const peer of peers)assert.deepEqual(peer.failures,[]);
  const audit=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(audit.filter(row=>row.method==='session/prompt').length,8);assert.equal(audit.filter(row=>row.method==='session/load'||row.method==='session/resume').length,0);
  global.gc?.();const after=process.memoryUsage(),used=process.cpuUsage(cpu),diagnostics=host.diagnostics();
  return {indexedSessions:count,indexedWorkspaces:4000,presentWorkspaces:100,discoverableRoots:1000,clients:32,activeAgents:8,
   titleActionEcho:summarise(metadata),titleAllFourViewers:summarise(allViewers),roundCatalogConvergence:summarise(convergence),convergenceReads,catalogList50:summarise(lists),maximumPageBytes,
   harnessAndHostMemory:{rssBeforeBytes:before.rss,rssAfterBytes:after.rss,heapBeforeBytes:before.heapUsed,heapAfterBytes:after.heapUsed},
   hostAndHarnessCpuMs:{user:used.user/1000,system:used.system/1000},diagnostics,
   noDormantAgentStarts:true,exactPrompts:8,independentHistoryPages:true,noProtocolSchemaFailures:true};
 }finally{for(const peer of peers)peer.close();await host.close();}
}

if(process.argv[2]==='--probe'){
 process.stdout.write(JSON.stringify(await probe(process.argv[3],Number(process.argv[4])))+'\n');
}else{
 const results=[];
 const directory=await mkdtemp(join(tmpdir(),'unified-scale-'));
 try{
  for(const count of [25000,100000]){
   const path=join(directory,String(count));await (await import('node:fs/promises')).mkdir(path);
   const seeded=spawnSync(python,['-I',fixture('catalog-scale.py'),path,String(count)],{encoding:'utf8'});assert.equal(seeded.status,0,seeded.stderr);
   const run=spawnSync(process.execPath,['--expose-gc',fileURLToPath(import.meta.url),'--probe',path,String(count)],{encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});assert.equal(run.status,0,run.stderr);results.push(JSON.parse(run.stdout));
  }
  const receipt={scope:'Synthetic installed host/catalog with 32 wire clients and 8 independent ACP fixture agents; warm filesystem, fresh host process per catalog size. This developer workstation may run concurrent qualification work. Node memory/CPU includes benchmark clients; subprocess memory, real UI/model, cold native history and slow socket backpressure are separate gates.',
   components:{host:{revision:hostRevision,artifactSha256:createHash('sha256').update(await readFile(hostArtifact)).digest('hex')},catalog:{revision:catalogRevision}},
   environment:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,systemMemoryBytes:totalmem()},results};
  if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(receipt,null,2)+'\n');process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
 }finally{await rm(directory,{recursive:true,force:true})}
}
