import WebSocket from 'ws';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import assert from 'node:assert/strict';
const ajv=new Ajv2020({strict:false,allErrors:true});addFormats(ajv);
const urls={};
let actionSchema;
for(const kind of ['commands','actions','state','notifications','errors']){
 const schema=JSON.parse(readFileSync(new URL('../upstream/ahp/'+kind+'.schema.json',import.meta.url),'utf8'));
 ajv.addSchema(schema);urls[kind]=schema.$id;
 if(kind==='actions')actionSchema=schema;
}
const compiled=new Map();
// Upstream 0.9's generated StateAction union has a dangling #/$defs/ member.
// Keep upstream files byte-exact. Validate the envelope and its concrete action
// independently against the SAME upstream definitions; never accept an unknown
// action or loosen its payload because that generated union cannot compile.
const envelope={...actionSchema.$defs.ActionEnvelope,
 $defs:actionSchema.$defs,
 properties:{...actionSchema.$defs.ActionEnvelope.properties,action:{type:'object'}}};
const checkEnvelope=ajv.compile(envelope);
const actionNames=new Map(Object.entries(actionSchema.$defs).filter(([,value])=>typeof value.properties?.type?.const==='string').map(([name,value])=>[value.properties.type.const,name]));
export function validate(kind,name,value){
 if(kind==='actions'&&name==='ActionEnvelope'){
  assert.equal(checkEnvelope(value),true,JSON.stringify(checkEnvelope.errors));
  const concrete=actionNames.get(value.action?.type);assert.ok(concrete,'Unknown action discriminator: '+value.action?.type);
  return validate('actions',concrete,value.action);
 }
 const key=kind+':'+name;if(!compiled.has(key))compiled.set(key,ajv.compile({$ref:urls[kind]+'#/$defs/'+name}));
 const fn=compiled.get(key);assert.equal(fn(value),true,`${name}: ${JSON.stringify(fn.errors)}`);
}
export class Peer{
 constructor(socket){this.socket=socket;this.next=1;this.pending=new Map();this.events=[];this.waiters=[];this.failures=[];
  socket.on('message',raw=>{const value=JSON.parse(raw.toString());
   if(value.id!==undefined){const pending=this.pending.get(value.id);if(pending){this.pending.delete(value.id);clearTimeout(pending.timer);value.error?pending.reject(Object.assign(Error(value.error.message),value.error)):pending.resolve(value.result);return;}}
   if(value.method==='action')try{validate('actions','ActionEnvelope',value.params);}catch(error){if(!this.failures.includes(error.message))this.failures.push(error.message);}
   this.events.push(value);this.check();
  });
 }
 static async open(url,headers){const socket=new WebSocket(url,{headers});await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});return new Peer(socket);}
 request(method,params){return new Promise((resolve,reject)=>{const id=this.next++;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Timeout: '+method));},10000);this.pending.set(id,{resolve,reject,timer});this.socket.send(JSON.stringify({jsonrpc:'2.0',id,method,params}));});}
 dispatch(channel,action,clientSeq){this.socket.send(JSON.stringify({jsonrpc:'2.0',method:'dispatchAction',params:{channel,action,clientSeq}}));}
 wait(predicate){const existing=this.events.find(predicate);if(existing)return Promise.resolve(existing);return new Promise((resolve,reject)=>{const item={predicate,resolve,timer:setTimeout(()=>{this.waiters=this.waiters.filter(x=>x!==item);reject(Error('Event timeout'));},10000)};this.waiters.push(item);});}
 check(){for(const item of [...this.waiters]){const value=this.events.find(item.predicate);if(value){clearTimeout(item.timer);this.waiters=this.waiters.filter(x=>x!==item);item.resolve(value);}}}
 close(){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('Peer closed'));}for(const w of this.waiters)clearTimeout(w.timer);this.socket.close();}
}
