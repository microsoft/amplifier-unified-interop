/** Published ACP adapters, independent SDK client and public AHP host. No retries. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {Readable,Writable} from 'node:stream';
import {randomUUID,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {ClientSideConnection,ndJsonStream,RequestError} from '@agentclientprotocol/sdk';
import {Peer,validate} from './wire.mjs';

const [configPath,outputPath]=process.argv.slice(2);
if(!configPath||!outputPath)throw Error('Usage: node test/vendor-qualification.mjs /owned/config.json /owned/receipt.json');
await assert.rejects(stat(outputPath),error=>error.code==='ENOENT','Use a new receipt path; never overwrite unknown evidence');
const config=JSON.parse(await readFile(configPath,'utf8'));
assert.ok(Array.isArray(config.adapters)&&config.adapters.length>0&&config.adapters.length<=8);
const receipt={createdAt:new Date().toISOString(),scope:'Independent installed public ACP adapters; protocol/model discovery and optional one fresh bounded host turn per adapter. No browser/device/deployment claim.',promptPolicy:'Never retry. Write unknown admission before dispatch. Refuse client tool effects. Preserve task-owned state and receipts.',adapters:[]};
const save=()=>writeFile(outputPath,JSON.stringify(receipt,null,2)+'\n');
const bounded=(promise,ms=30000)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Qualification deadline exceeded; inspect unknown outcome without replay')),ms)})]).finally(()=>clearTimeout(timer));};
// Errors can contain provider payloads. Persist an error class/code, never bodies or stderr.
const fault=error=>({name:error.name??'Error',code:Number.isSafeInteger(error.code)?error.code:undefined,deadline:/deadline|Timeout/.test(error.message)});
const options=value=>(value??[]).map(o=>({id:o.id,name:o.name,category:o.category,type:o.type,currentValue:o.currentValue,options:o.options}));
for(const adapter of config.adapters){
 const state=resolve(adapter.stateDirectory);assert.ok(state!==resolve(process.env.HOME),'Task-owned state directory required');
 const home=join(state,'home'),cwd=join(state,'workspace');await mkdir(home,{recursive:true,mode:0o700});await mkdir(cwd,{recursive:true});
await writeFile(join(state,'qualification-started.json'),JSON.stringify({receipt:resolve(outputPath),startedAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
 const env={OPENAI_API_KEY:'',CODEX_API_KEY:'',ANTHROPIC_API_KEY:'',CLAUDE_CODE_OAUTH_TOKEN:'',GH_TOKEN:'',GITHUB_TOKEN:'',COPILOT_GITHUB_TOKEN:'',CODEX_CONFIG:'{}',GH_CONFIG_DIR:join(home,'.gh'),PATH:process.env.PATH,HOME:home,TMPDIR:state,XDG_CONFIG_HOME:join(home,'.config'),XDG_CACHE_HOME:join(home,'.cache'),CODEX_HOME:join(home,'.codex'),CLAUDE_CONFIG_DIR:join(home,'.claude'),NO_BROWSER:'1',...adapter.env};
 for(const name of adapter.credentialEnvironment??[]){assert.ok(['OPENAI_API_KEY','CODEX_API_KEY','ANTHROPIC_API_KEY','CLAUDE_CODE_OAUTH_TOKEN','GH_TOKEN','GITHUB_TOKEN','COPILOT_GITHUB_TOKEN'].includes(name));if(process.env[name])env[name]=process.env[name];}
 for(const name of ['HOME','CODEX_HOME','CLAUDE_CONFIG_DIR','XDG_CONFIG_HOME','XDG_CACHE_HOME','GH_CONFIG_DIR'])assert.ok(env[name].startsWith(home+'/')||env[name]===home,'Adapter state must stay in its task-owned home');
 // Supplied config is private and may hold credentials; it is never copied to a receipt.
 const row={id:adapter.id,package:adapter.package,artifactSha256:createHash('sha256').update(await readFile(adapter.artifact)).digest('hex'),stateDirectory:state,transport:'ACP v1 stdio',direct:{status:'not-started'},host:{status:'not-started'},accountTurn:{status:'skipped',reason:'No explicit fresh prompt requested'}};receipt.adapters.push(row);await save();
 const child=spawn(adapter.command,adapter.args??[],{cwd,env,stdio:'pipe'});child.stderr.resume();let clientRequests=0;
 child.on('error',()=>{});
 const connection=new ClientSideConnection(()=>({sessionUpdate:async()=>{},requestPermission:async()=>{clientRequests++;return {outcome:{outcome:'cancelled'}}},readTextFile:async()=>{clientRequests++;throw RequestError.invalidRequest('Qualification refuses file reads')},writeTextFile:async()=>{clientRequests++;throw RequestError.invalidRequest('Qualification refuses file writes')},createTerminal:async()=>{clientRequests++;throw RequestError.invalidRequest('Qualification refuses terminals')}}),ndJsonStream(Writable.toWeb(child.stdin),Readable.toWeb(child.stdout)));
 try{
  const initialized=await bounded(connection.initialize({protocolVersion:1,clientInfo:{name:'unified-independent-qualification',version:'1'},clientCapabilities:{}}));assert.equal(initialized.protocolVersion,1);
  row.direct={status:'initialized',agentInfo:initialized.agentInfo,capabilities:initialized.agentCapabilities,authMethods:initialized.authMethods?.map(m=>({id:m.id,name:m.name})),sessionStatus:'unknown'};await save();
  const session=await bounded(connection.newSession({cwd,mcpServers:[]}));assert.ok(session.sessionId);
  row.direct.sessionStatus='created';row.direct.nativeSessionId=session.sessionId;row.direct.configOptions=options(session.configOptions);row.direct.legacyModels=session.models;row.direct.legacyModes=session.modes;row.direct.promptCalls=0;
 }catch(error){row.direct.error=fault(error);if(row.direct.status==='not-started')row.direct.status='failed';else row.direct.sessionStatus='failed-or-unknown';}
 finally{child.stdin.end();child.kill('SIGTERM');await bounded(new Promise(r=>{if(child.exitCode!==null)r();else{child.once('exit',r);setTimeout(()=>{child.kill('SIGKILL');r()},2000).unref()}}),3000);row.direct.refusedClientEffects=clientRequests;await save();}
 if(!process.env.UNIFIED_HOST_MODULE){row.host={status:'skipped',reason:'No installed host module'};await save();continue;}
 const {createHost}=await import(process.env.UNIFIED_HOST_MODULE);let host,peer;
 try{
  host=await createHost({stateDirectory:join(state,'host'),allowedWorkspaceRoots:[cwd],port:0,engines:[{id:adapter.id,label:adapter.id,command:adapter.command,args:adapter.args,env}],nativeHostRequest:undefined});
  peer=await Peer.open(host.url);const init=await peer.request('initialize',{channel:'ahp-root://',clientId:randomUUID(),protocolVersions:['0.9.0'],initialSubscriptions:['ahp-root://']});validate('commands','InitializeResult',init);
  const session='ahp-session:/'+randomUUID(),chat=session.replace('ahp-session:','ahp-chat:');row.host={status:'creation-unknown',session};await save();
  await bounded(peer.request('createSession',{channel:session,provider:adapter.id,workingDirectories:[pathToFileURL(cwd).href]}));
  const snapshot=(await peer.request('subscribe',{channel:session})).snapshot;validate('state','SessionState',snapshot.state);assert.equal(snapshot.state.provider,adapter.id);
  row.host={status:'created',session,provider:snapshot.state.provider,config:snapshot.state.config,acp:snapshot.state._meta?.['amplifier.dev/acp']};await save();
  if(adapter.prompt){
   assert.equal(typeof adapter.prompt,'string');assert.ok(adapter.prompt.length<=500);
   if(adapter.model){const advertised=snapshot.state.config?.schema?.properties?.[adapter.model.configId]?.enum;assert.ok(advertised?.includes(adapter.model.value),'Explicit model must be discovered through this host session');peer.dispatch(session,{type:'session/configChanged',config:{[adapter.model.configId]:adapter.model.value}},1);const configured=await peer.wait(e=>e.method==='action'&&e.params.channel===session&&e.params.action.type==='session/configChanged'&&e.params.origin?.clientSeq===1);assert.ok(!configured.params.rejectionReason,'Model selection refused');row.host.selectedModel=adapter.model;}
   await peer.request('subscribe',{channel:chat,view:{turns:1}});const turnId=randomUUID();row.accountTurn={status:'unknown',turnId,promptSha256:createHash('sha256').update(adapter.prompt).digest('hex'),dispatches:1};await save();
   peer.dispatch(chat,{type:'chat/turnStarted',turnId,startedAt:new Date().toISOString(),message:{text:adapter.prompt,origin:{kind:'user'}}},2);
   await bounded(peer.wait(e=>e.method==='action'&&e.params.channel===chat&&e.params.action.turnId===turnId&&['chat/turnComplete','chat/error'].includes(e.params.action.type),30000),31000);
   const result=(await peer.request('subscribe',{channel:chat,view:{turns:1}})).snapshot.state;validate('state','ChatState',result);const turn=result.turns.find(t=>t.id===turnId);row.accountTurn.result=turn;row.accountTurn.status=turn?.state=== 'complete'?'completed':'settled-see-result';row.accountTurn.receipt=await peer.request('x-commandReceipt',{channel:'ahp-root://',commandId:turnId});if(row.accountTurn.receipt.status==='unknown')row.accountTurn.status='unknown';const text=turn?.responseParts.filter(p=>p.kind==='markdown').map(p=>p.content).join('')??'';row.accountTurn.toolCalls=turn?.responseParts.filter(p=>p.kind==='toolCall').length??0;row.accountTurn.expectedTextMatches=adapter.expectedText?text.trim()===adapter.expectedText:undefined;row.accountTurn.qualified=turn?.state==='complete'&&row.accountTurn.receipt.status==='completed'&&row.accountTurn.toolCalls===0&&(adapter.expectedText?row.accountTurn.expectedTextMatches:true);
  }
  assert.deepEqual(peer.failures,[]);row.host.schemaFailures=0;
 }catch(error){row.host.error=fault(error);if(row.host.status==='not-started')row.host.status='failed';if(adapter.prompt&&row.accountTurn.status==='skipped')row.accountTurn.reason='Host or model selection did not qualify; no prompt dispatched';}
 finally{peer?.close();peer?.socket.terminate();await host?.close();await save();}
}
await save();
