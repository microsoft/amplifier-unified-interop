/** Current published upstream client, public exports and reducers only. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Peer} from './wire.mjs';
const packagePath=process.env.OFFICIAL_AHP_PACKAGE,hostModule=process.env.UNIFIED_HOST_MODULE;
test('current official AHP client negotiates compatible baseline and reduces live turns across client swaps',{skip:!packagePath||!hostModule},async()=>{
 const metadata=JSON.parse(await readFile(join(packagePath,'package.json'),'utf8'));
 const exported=async name=>import(pathToFileURL(join(packagePath,metadata.exports[name].import)).href);
 const {AhpClient,AhpStateMirror}=await exported('./client'),{WebSocketTransport}=await exported('./ws'),{SUPPORTED_PROTOCOL_VERSIONS,chatReducer}=await exported('.');
 const {createHost}=await import(hostModule),directory=await mkdtemp(join(tmpdir(),'ahp-official-client-')),log=join(directory,'agent.jsonl');let host,observer;const clients=[];
 const open=async()=>{const c=new AhpClient(await WebSocketTransport.connect(host.url),{requestTimeoutMs:10000,subscriptionBuffer:64});clients.push(c);c.connect();return c;};
 const deadline=async p=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Official client journey timed out')),10000))])}finally{clearTimeout(timer)}};
 try{
  host=await createHost({stateDirectory:join(directory,'host'),allowedWorkspaceRoots:[directory],engines:[{id:'fixture',command:process.execPath,args:[fileURLToPath(new URL('../fixtures/acp-agent.mjs',import.meta.url))],env:{FIXTURE_LOG:log}}]});
  const client=await open(),clientId=randomUUID(),init=await client.initialize({clientId,protocolVersions:SUPPORTED_PROTOCOL_VERSIONS,initialSubscriptions:['ahp-root://']});assert.equal(init.protocolVersion,'0.9.0');
  const mirror=new AhpStateMirror();for(const s of init.snapshots)mirror.applySnapshot(s);assert.equal(mirror.root.agents[0].provider,'fixture');
  const session='ahp-session:/'+randomUUID(),chat=session.replace('ahp-session:','ahp-chat:');await client.request('createSession',{channel:session,provider:'fixture',workingDirectories:[pathToFileURL(directory).href]});
  const viewed=await client.subscribe(session);mirror.applySnapshot(viewed.result.snapshot);assert.equal(mirror.getSession(session).provider,'fixture');
  const {result,subscription}=await client.subscribe(chat,{view:{turns:1}});let state=result.snapshot.state,lastSeq=result.snapshot.fromSeq;
  observer=await Peer.open(host.url);await observer.request('initialize',{channel:'ahp-root://',clientId:randomUUID(),protocolVersions:['0.9.0'],initialSubscriptions:[chat]});
  const turnId=randomUUID(),finished=(async()=>{for await(const e of subscription){if(e.type==='action'){lastSeq=e.params.serverSeq;state=chatReducer(state,e.params.action);if(e.params.action.type==='chat/turnComplete'&&e.params.action.turnId===turnId)return;}}})();
  client.dispatch(chat,{type:'chat/turnStarted',turnId,startedAt:new Date().toISOString(),message:{text:'Official SDK disposable fixture turn',origin:{kind:'user'}}});await deadline(finished);
  const observed=(await observer.request('subscribe',{channel:chat,view:{turns:1}})).snapshot.state;assert.deepEqual(JSON.parse(JSON.stringify(state.turns)),observed.turns);assert.equal(state.turns[0].state,'complete');assert.equal(state.turns[0].responseParts.map(p=>p.content??'').join(''),'Independent reply: Official SDK disposable fixture turn');
  await client.shutdown();const resumed=await open(),recovery=await resumed.reconnect({clientId,lastSeenServerSeq:lastSeq,subscriptions:[session,chat]});assert.equal(recovery.type,'replay');
  const lost=await open(),fresh=await lost.initialize({clientId:randomUUID(),protocolVersions:SUPPORTED_PROTOCOL_VERSIONS,initialSubscriptions:[session,chat]});assert.equal(fresh.snapshots[0].state.provider,'fixture');assert.deepEqual(fresh.snapshots[1].state.turns,observed.turns);
  const catalog=await lost.request('listSessions',{channel:'ahp-root://',limit:1});assert.equal(catalog.items.length,1);
  assert.equal((await readFile(log,'utf8')).trim().split('\n').map(JSON.parse).filter(x=>x.method==='session/prompt').length,1);assert.deepEqual(observer.failures,[]);
  console.log(JSON.stringify({officialPackage:metadata.name,version:metadata.version,offered:SUPPORTED_PROTOCOL_VERSIONS,negotiated:init.protocolVersion,currentReducerComplete:true,observerMatches:true,reconnect:recovery.type,lostBaselineSnapshot:true,exactPrompts:1}));
 }finally{observer?.close();observer?.socket.terminate();for(const c of clients)await c.shutdown();await host?.close();await rm(directory,{recursive:true,force:true});}
});
