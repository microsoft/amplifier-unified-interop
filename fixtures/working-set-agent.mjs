/** Independent ACP peer: generated cold history, gated execution, real stream pressure. */
import {createInterface} from 'node:readline';
import {appendFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const log=row=>appendFileSync(process.env.FIXTURE_LOG,JSON.stringify({pid:process.pid,...row})+'\n');
const send=async value=>{if(!process.stdout.write(JSON.stringify({jsonrpc:'2.0',...value})+'\n'))await once(process.stdout,'drain');};
const reply=(id,result)=>send({id,result});
let busy=false;
log({kind:'process-start'});
createInterface({input:process.stdin}).on('line',async line=>{
 const {id,method,params={}}=JSON.parse(line);if(!method)return;
 log({method,sessionId:params.sessionId,limit:params.limit,cursor:params.cursor});
 try{
  if(method==='initialize')return reply(id,{protocolVersion:1,agentCapabilities:{loadSession:true,sessionCapabilities:{resume:{},close:{}},_meta:{'amplifier.dev/native':{version:1,history:{version:1,paging:'complete-turns',passive:true},workers:{version:1,passiveInspection:true},lifecycle:{version:1,gracefulRetire:true}}}},authMethods:[]});
  if(method==='session/new')return reply(id,{sessionId:randomUUID(),configOptions:[]});
  if(method==='session/load'||method==='session/resume')throw Error('Cold reads must never mount a runtime');
  if(method==='session/close')return reply(id,{});
  if(method==='_amplifier/retire')return reply(id,{retired:!busy,...(busy?{reason:'owned_work'}:{})});
  if(method==='_amplifier/history'){
   const end=Number(params.cursor??1500),start=Math.max(0,end-params.limit);
   const turnGroups=Array.from({length:end-start},(_,n)=>{const i=start+n;return {id:'cold-turn-'+i,state:'complete',updates:[{sessionUpdate:'user_message_chunk',content:{type:'text',text:'Historical request '+i},_meta:{'amplifier.dev/history':{messageId:'native-user-'+i}}},{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'Historical answer '+i},_meta:{'amplifier.dev/history':{messageId:'native-answer-'+i}}}]};});
   return reply(id,{turnGroups,updates:[],revision:'independent-fixed-history-v1',nextCursor:start?String(start):null,diagnostics:[]});
  }
  if(method==='_amplifier/workers'){
   const start=Number(params.cursor??0),end=Math.min(700,start+params.limit);
   return reply(id,{available:true,source:'native-worker-index',revision:1,resident:false,items:Array.from({length:end-start},(_,n)=>({id:'worker-'+(start+n),status:'completed',residencyUnverified:true})),results:[],...(end<700?{nextCursor:String(end)}:{})});
  }
  if(method==='session/prompt'){
   busy=true;const text=params.prompt.filter(p=>p.type==='text').map(p=>p.text).join('');log({kind:'prompt',text});
   if(text.startsWith('gate:'))while(!existsSync(join(process.env.FIXTURE_GATES,text.slice(5))))await sleep(10);
   const chunks=text==='pressure'?240:1;
   for(let i=0;i<chunks;i++){
    await send({method:'session/update',params:{sessionId:params.sessionId,update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:text==='pressure'?'x'.repeat(32768):'Independent reply '+text}}}});
    if(chunks>1)await sleep(5);
   }
   busy=false;return reply(id,{stopReason:'end_turn'});
  }
  if(method==='session/cancel'){busy=false;return;}
  throw Error('Unsupported independent fixture method '+method);
 }catch(error){if(id!==undefined)await send({id,error:{code:-32601,message:String(error)}});}
});
