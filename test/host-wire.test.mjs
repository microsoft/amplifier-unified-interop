import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {Peer,validate} from './wire.mjs';
const root='ahp-root://';
const command=process.env.UNIFIED_HOST_COMMAND?JSON.parse(process.env.UNIFIED_HOST_COMMAND):null;
async function host(){
 const home=await mkdtemp(join(tmpdir(),'unified-interop-')),cwd=join(home,'workspace');await mkdir(cwd);
 const log=join(home,'agent.jsonl'),config=join(home,'host.json');
 await writeFile(config,JSON.stringify({stateDirectory:join(home,'state'),allowedWorkspaceRoots:[cwd],port:0,engines:[{id:'fixture',label:'Independent ACP fixture',command:process.execPath,args:[fileURLToPath(new URL('../fixtures/acp-agent.mjs',import.meta.url))],env:{FIXTURE_LOG:log}}]}));
 const child=spawn(command[0],[...command.slice(1),'--config',config],{stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',data=>{stderr+=data.toString().slice(0,2000)});
 const url=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{child.kill();reject(Error('Host startup timed out: '+stderr));},10000);child.once('exit',code=>{clearTimeout(timeout);reject(Error('Host exit '+code+': '+stderr));});createInterface({input:child.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(value.url){clearTimeout(timeout);resolve(value.url);}}catch{}});});
 const peers=[];
 return {home,cwd,log,url,async peer(id=randomUUID()){const p=await Peer.open(url);peers.push(p);const init=await p.request('initialize',{channel:root,clientId:id,protocolVersions:['0.9.0'],initialSubscriptions:[root]});validate('commands','InitializeResult',init);validate('state','RootState',init.snapshots[0].state);return p;},async close(){for(const p of peers)p.close();child.kill('SIGTERM');await Promise.race([once(child,'exit'),new Promise(resolve=>setTimeout(resolve,2000))]);if(child.exitCode===null)child.kill('SIGKILL');await rm(home,{recursive:true,force:true});}};
}
function action(text,id=randomUUID()){return {type:'chat/turnStarted',turnId:id,startedAt:new Date().toISOString(),message:{text,origin:{kind:'user'}}};}
async function newSession(f,p){const session='ahp-session:/'+randomUUID(),chat=session.replace('ahp-session:','ahp-chat:');await p.request('createSession',{channel:session,provider:'fixture',workingDirectories:[pathToFileURL(f.cwd).href]});return {session,chat};}
async function subscribe(p,channel,view){const result=await p.request('subscribe',{channel,...(view?{view}:{})});validate('commands','SubscribeResult',result);validate('state',channel.startsWith('ahp-chat:')?'ChatState':'SessionState',result.snapshot.state);return result;}
const terminalEvent=id=>row=>row.method==='action'&&row.params.action.turnId===id&&['chat/turnComplete','chat/turnCompleted','chat/error'].includes(row.params.action.type);
test('wire schemas, two clients, scoped catalog and independent ACP execution',{skip:!command},async()=>{
 const f=await host();try{
  const a=await f.peer(),b=await f.peer(),{session,chat}=await newSession(f,a);
  await subscribe(a,session);await subscribe(a,chat,{turns:2});await subscribe(b,chat,{turns:2});
  const turn=action('hello');a.dispatch(chat,turn,1);
  await Promise.all([a.wait(terminalEvent(turn.turnId)),b.wait(terminalEvent(turn.turnId))]);
  const sa=await subscribe(a,chat,{turns:2}),sb=await subscribe(b,chat,{turns:2});assert.deepEqual(sa.snapshot.state.turns,sb.snapshot.state.turns);
  assert.equal(sa.snapshot.state.turns.length,1);
  const list=await a.request('listSessions',{channel:root,limit:1});validate('commands','ListSessionsResult',list);assert.equal(list.items.length,1);
  a.dispatch(chat,turn,2);await a.wait(e=>e.method==='action'&&e.params.rejectionReason);
  const calls=(await readFile(f.log,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(calls.filter(x=>x.method==='session/prompt').length,1);
  assert.deepEqual(a.failures,[]);assert.deepEqual(b.failures,[]);
 }finally{await f.close();}
});
test('upstream permission choices and authoritative denial',{skip:!command},async()=>{
 const f=await host();try{
  const p=await f.peer(),{chat}=await newSession(f,p);await subscribe(p,chat,{turns:2});const turn=action('permission');p.dispatch(chat,turn,1);
  const ready=await p.wait(e=>e.method==='action'&&e.params.action.type==='chat/toolCallReady');
  assert.equal(ready.params.action.options.some(o=>o.id==='deny'),true);
  p.dispatch(chat,{type:'chat/toolCallConfirmed',turnId:turn.turnId,toolCallId:'fixture-tool',approved:false,reason:'denied',selectedOptionId:'deny'},2);
  await p.wait(terminalEvent(turn.turnId));await subscribe(p,chat,{turns:2});assert.deepEqual(p.failures,[]);
 }finally{await f.close();}
});
test('bundled protocol schema references remain valid',()=>validate('state','RootState',{agents:[]}));
