import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Peer} from './wire.mjs';

test('installed host keeps long capability waits independent of same-client controls and receipts',{skip:!process.env.UNIFIED_HOST_MODULE},async()=>{
 const {createHost}=await import(process.env.UNIFIED_HOST_MODULE),directory=await mkdtemp(join(tmpdir(),'ahp-independent-rpc-'));
 let releaseHandshake,releaseWait,enteredWait;const handshake=new Promise(resolve=>releaseHandshake=resolve),waiting=new Promise(resolve=>releaseWait=resolve),entered=new Promise(resolve=>enteredWait=resolve);
 const effects=[],request=(operation,commandId)=>({channel:'ahp-root://',topic:'generic-fixture',operation,version:1,args:{},commandId});
 const host=await createHost({stateDirectory:directory,allowedWorkspaceRoots:[directory],engines:[{id:'unused',command:'/must-not-start'}],clientMetadata:async()=>{await handshake;return {};},capabilities:{manifest:{version:1,topics:{'generic-fixture':{uri:'fixture://topic',version:1}},actions:Object.fromEntries(['wait','control'].map(operation=>[operation,{topic:'generic-fixture',operation,method:'x-amplifier/capabilityAction'}]))},read:async()=>({topic:'generic-fixture',scope:'host',revision:0,data:{ready:true}}),action:async p=>{effects.push(p.commandId);if(p.operation==='wait'){enteredWait();await waiting;}return {accepted:true};}}});
 const peer=await Peer.open(host.url);let settled=false;
 try{
  // Pipeline behind the handshake deliberately: these requests must share its
  // barrier, without the wait extending the barrier for all subsequent work.
  const initialized=peer.request('initialize',{channel:'ahp-root://',clientId:randomUUID(),protocolVersions:['0.9.0']});
  const longWait=peer.request('x-amplifier/capabilityAction',request('wait','long-wait')).then(result=>{settled=true;return result;});
  // Cleanup must not obscure an earlier failure with an unhandled rejection.
  // The original promise is still awaited below and retains its failure.
  longWait.catch(()=>{});
  await new Promise(resolve=>setTimeout(resolve,30));assert.deepEqual(effects,[]);releaseHandshake();await initialized;await entered;
  const start=performance.now();
  const duplicate=request('control','exact-control');
  const controls=await Promise.allSettled([peer.request('x-amplifier/capabilityAction',duplicate),peer.request('x-amplifier/capabilityAction',duplicate)]);
  assert.equal(controls.filter(result=>result.status==='fulfilled').length,1);assert.equal(controls.filter(result=>result.status==='rejected').length,1);
  const [receipt,page,resource]=await Promise.all([peer.request('x-commandReceipt',{channel:'ahp-root://',commandId:'exact-control'}),peer.request('listSessions',{channel:'ahp-root://',limit:50}),peer.request('resourceRead',{channel:'ahp-root://',uri:'fixture://topic?scope=host',encoding:'utf-8'})]);
  const latency=performance.now()-start;assert.ok(latency<2000,`Control/receipt delayed ${latency}ms`);assert.equal(settled,false);assert.equal(receipt.status,'completed');assert.deepEqual(page.items,[]);assert.equal(JSON.parse(resource.data).data.ready,true);assert.equal(effects.filter(id=>id==='exact-control').length,1);
  assert.equal((await peer.request('x-commandReceipt',{channel:'ahp-root://',commandId:'long-wait'})).status,'dispatching');
  releaseWait();assert.equal((await longWait).accepted,true);assert.equal((await peer.request('x-commandReceipt',{channel:'ahp-root://',commandId:'long-wait'})).status,'completed');assert.equal(host.diagnostics().activeAgents,0);
  console.log(JSON.stringify({concurrentControlReceiptMs:latency,waitWasPending:true,duplicateEffects:1,handshakeRespected:true}));
 }finally{releaseHandshake();releaseWait();peer.close();peer.socket.terminate();await host.close();await rm(directory,{recursive:true,force:true});}
});
