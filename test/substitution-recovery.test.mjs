/** Independent wire consumers of the public installed executable. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Peer,validate} from './wire.mjs';
const command=process.env.UNIFIED_HOST_COMMAND?JSON.parse(process.env.UNIFIED_HOST_COMMAND):null,root='ahp-root://';
const wait=async fn=>{const end=Date.now()+5000;while(!await fn()){assert.ok(Date.now()<end,'Condition timed out');await new Promise(r=>setTimeout(r,10));}};
test('creation chooses agent; replacement clients recover identity and lost state without prompt replay',{skip:!command},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'ahp-swaps-')),workspace=join(directory,'workspace'),peers=[];let child;
 await mkdir(workspace);const config=join(directory,'host.json'),logs=['alpha','beta'].map(id=>join(directory,id+'.jsonl'));
 await writeFile(config,JSON.stringify({stateDirectory:join(directory,'state'),allowedWorkspaceRoots:[workspace],port:0,replayLimit:4,engines:['alpha','beta'].map((id,i)=>({id,label:id,command:process.execPath,args:[fileURLToPath(new URL('../fixtures/acp-agent.mjs',import.meta.url))],env:{FIXTURE_IDENTITY:id,FIXTURE_LOG:logs[i]}}))}));
 const start=async()=>{child=spawn(command[0],[...command.slice(1),'--config',config],{stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',b=>stderr=(stderr+b).slice(-2000));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Host startup timed out: '+stderr)),10000);child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('exit',code=>{clearTimeout(timer);reject(Error('Host exit '+code+': '+stderr))});createInterface({input:child.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(value.url){clearTimeout(timer);resolve(value.url)}}catch{}})});};
 const stop=async()=>{child.kill();await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,2000))]);if(child.exitCode===null)child.kill('SIGKILL');};
 const open=async(url,id=randomUUID(),subscriptions=[])=>{const p=await Peer.open(url);peers.push(p);const init=await p.request('initialize',{channel:root,clientId:id,protocolVersions:['0.9.0'],initialSubscriptions:subscriptions});validate('commands','InitializeResult',init);return {p,init,id};};
 const audit=async i=>(await readFile(logs[i],'utf8')).trim().split('\n').map(JSON.parse);
 try{
  let url=await start();const owner=await open(url),sessions=[];
  for(const provider of ['alpha','beta']){const session='ahp-session:/'+randomUUID();await owner.p.request('createSession',{channel:session,provider,workingDirectories:[pathToFileURL(workspace).href]});sessions.push(session);}
  const chats=sessions.map(s=>s.replace('ahp-session:','ahp-chat:'));
  for(let i=0;i<2;i++){const page=await owner.p.request('subscribe',{channel:sessions[i]});assert.equal(page.snapshot.state.provider,['alpha','beta'][i]);await owner.p.request('subscribe',{channel:chats[i],view:{turns:2}});}
  const turnId=randomUUID(),turn={type:'chat/turnStarted',turnId,startedAt:new Date().toISOString(),message:{text:'Fresh disposable fixture turn',origin:{kind:'user'}}};
  owner.p.dispatch(chats[0],turn,1);await owner.p.wait(e=>e.method==='action'&&e.params.action.type==='chat/turnComplete'&&e.params.action.turnId===turnId);
  const baseline=(await owner.p.request('subscribe',{channel:chats[0],view:{turns:2}})).snapshot;validate('state','ChatState',baseline.state);
  // A different client attaches to the existing conversation, retaining its agent.
  const replacement=await open(url,randomUUID(),[sessions[0],chats[0]]);assert.equal(replacement.init.snapshots.find(s=>s.resource===sessions[0]).state.provider,'alpha');assert.deepEqual(replacement.init.snapshots.find(s=>s.resource===chats[0]).state.turns,baseline.state.turns);
  const rememberedId=owner.id;owner.p.close();await once(owner.p.socket,'close');
  for(let seq=2;seq<10;seq++){replacement.p.dispatch(sessions[0],{type:'session/titleChanged',title:'Recovery title '+seq},seq);await replacement.p.wait(e=>e.method==='action'&&e.params.action.title==='Recovery title '+seq);}
  const recovered=await Peer.open(url);peers.push(recovered);const gap=await recovered.request('reconnect',{clientId:rememberedId,lastSeenServerSeq:baseline.fromSeq,subscriptions:[sessions[0],chats[0]]});validate('commands','ReconnectResult',gap);assert.equal(gap.type,'snapshot');assert.equal(gap.snapshots.find(s=>s.resource===sessions[0]).state.provider,'alpha');assert.deepEqual(gap.snapshots.find(s=>s.resource===chats[0]).state.turns,baseline.state.turns);
  // A client with no confirmed baseline initializes and subscribes afresh.
  const lost=await open(url,randomUUID(),[chats[0]]);assert.deepEqual(lost.init.snapshots[0].state.turns,baseline.state.turns);
  for(const p of peers){assert.deepEqual(p.failures,[]);p.close();p.socket.terminate();}await wait(()=>peers.every(p=>p.socket.readyState===3));
  await stop();url=await start();const afterRestart=await open(url,randomUUID(),[sessions[0],chats[0]]);assert.equal(afterRestart.init.snapshots[0].state.provider,'alpha');assert.deepEqual(afterRestart.init.snapshots[1].state.turns,baseline.state.turns);
  assert.equal((await audit(0)).filter(x=>x.method==='session/new').length,1);assert.equal((await audit(0)).filter(x=>x.method==='session/prompt').length,1);assert.equal((await audit(1)).filter(x=>x.method==='session/new').length,1);assert.equal((await audit(1)).filter(x=>x.method==='session/prompt').length,0);
  console.log(JSON.stringify({creationProviders:['alpha','beta'],clientReplacement:true,expiredReplay:'snapshot',lostBaseline:'fresh initialize',hostReplacement:'passive persisted projection',exactPrompts:1,noDormantRestart:true}));
 }finally{for(const p of peers){p.close();p.socket.terminate()}if(child?.exitCode===null)await stop();await rm(directory,{recursive:true,force:true});}
});
