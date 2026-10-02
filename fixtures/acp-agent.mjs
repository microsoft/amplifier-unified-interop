/** Independent deterministic ACP v1 peer. It imports no product implementation. */
import {createInterface} from 'node:readline';
import {appendFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
let next=10000;
const permissions=new Map();
const prompts=new Map();
const send=value=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',...value})+'\n');
const reply=(id,result)=>send({id,result});
const update=(sessionId,value)=>send({method:'session/update',params:{sessionId,update:value}});
const log=value=>{if(process.env.FIXTURE_LOG)appendFileSync(process.env.FIXTURE_LOG,JSON.stringify(value)+'\n');};
createInterface({input:process.stdin}).on('line',async line=>{
 const message=JSON.parse(line);
 if(!message.method){permissions.get(message.id)?.(message.result);permissions.delete(message.id);return;}
 const {method,params={},id}=message;
 if(method==='initialize')return reply(id,{protocolVersion:1,agentInfo:{name:'independent-fixture',version:'1'},agentCapabilities:{loadSession:true,sessionCapabilities:{resume:{},close:{}}},authMethods:[]});
 if(method==='session/new')return reply(id,{sessionId:randomUUID(),configOptions:[]});
 if(method==='session/resume'||method==='session/load'){log({method,sessionId:params.sessionId});return reply(id,{configOptions:[]});}
 if(method==='session/close')return reply(id,{});
 if(method==='session/cancel'){prompts.get(params.sessionId)?.();return;}
 if(method==='session/prompt'){
  const text=params.prompt.map(p=>p.text||'').join('');log({method,sessionId:params.sessionId,text});
  if(text==='crash')process.exit(4);
  if(text==='hold')await new Promise(resolve=>prompts.set(params.sessionId,resolve));
  if(text==='permission'){
   update(params.sessionId,{sessionUpdate:'tool_call',toolCallId:'fixture-tool',title:'Fixture permission',status:'pending',kind:'other',rawInput:{}});
   const permissionId=next++;
   const result=await new Promise(resolve=>{permissions.set(permissionId,resolve);send({id:permissionId,method:'session/request_permission',params:{sessionId:params.sessionId,toolCall:{toolCallId:'fixture-tool',title:'Fixture permission',status:'pending'},options:[{optionId:'allow',name:'Allow once',kind:'allow_once'},{optionId:'deny',name:'Deny',kind:'reject_once'}]}});});
   update(params.sessionId,{sessionUpdate:'tool_call_update',toolCallId:'fixture-tool',status:result.outcome?.optionId==='allow'?'completed':'failed',content:[]});
  }
  update(params.sessionId,{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'Independent '}});
  update(params.sessionId,{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'reply: '+text}});
  prompts.delete(params.sessionId);return reply(id,{stopReason:text==='hold'?'cancelled':'end_turn'});
 }
 if(id!==undefined)send({id,error:{code:-32601,message:'Fixture method not implemented'}});
});
