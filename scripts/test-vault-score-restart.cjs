'use strict';
// Regression: a saved PIN snapshot containing only 9월 must never replace later 10월 PDF scores.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','app','index.html'),'utf8');
const start=html.indexOf('loginVault=async function(){',html.indexOf('// PIN 로그인은'));
const end=html.indexOf('if($("#loginBtn"))',start);
assert(start>0&&end>start,'final loginVault must be found');
const loginSource=html.slice(start,end);
function month(score,file){
  return {kor:score,math:2,eng:3,hist:1,inq1:3,inq2:4,source:'PDF',sourceFile:file};
}
function deepMerge(a,b){
  const out=JSON.parse(JSON.stringify(a||{}));
  for(const [key,months] of Object.entries(b||{})){
    out[key]=out[key]||{};
    for(const [exam,scores] of Object.entries(months||{}))
      out[key][exam]={...(out[key][exam]||{}),...(scores||{})};
  }
  return out;
}
function setup({snapshot,liveLibrary,liveState,libraryExists=true}){
  const db=new Map(),KEY='jinhakON.v1',LIB='jinhakON.scoreLibrary.v1.2027',VAULT='jinhakON.vault.v2';
  db.set(VAULT,JSON.stringify({mode:'gate',data:snapshot}));
  if(libraryExists)db.set(LIB,JSON.stringify(liveLibrary));
  if(liveState)db.set(KEY,JSON.stringify(liveState));
  const alerts=[];
  const localStorage={
    getItem:k=>db.has(k)?db.get(k):null,
    setItem:(k,v)=>db.set(k,String(v)),
    removeItem:k=>db.delete(k)
  };
  const ctx={
    S:{rows:[],changes:[],manualEvents:[]},
    VAULT,KEY,localStorage,loginVault:null,
    normPw:x=>String(x||'').trim(),
    $:sel=>({value:'1234'}),
    simpleHash:x=>'hash',
    decryptObj:async()=>{throw Error('unexpected decryption')},
    getLocalState:()=>JSON.parse(db.get(KEY)||'{}'),
    scoreLibraryKey:()=>LIB,
    readScoreLibrary:()=>JSON.parse(db.get(LIB)||'{"mocks":{},"imports":{}}'),
    writeScoreLibrary:x=>db.set(LIB,JSON.stringify(x)),
    mergeDeepMocks:deepMerge,
    buildStudents(){},openApp(){},jumpCalendarToData(){},render(){},
    toast:(msg)=>alerts.push(msg)
  };
  vm.createContext(ctx);
  vm.runInContext(loginSource,ctx,{filename:'actual-vault-login.js'});
  return {ctx,db,KEY,LIB,VAULT,alerts,readScores:()=>deepMerge(JSON.parse(db.get(LIB)||'{"mocks":{}}').mocks,JSON.parse(db.get(KEY)||'{"mocks":{}}').mocks)};
}
(async()=>{
  const name='3|8|1|가상학생';
  const sep={mocks:{[name]:{'9월':month(4,'9월.pdf')}},imports:{'9월':{count:1}}};
  const both={mocks:{[name]:{'9월':month(4,'9월.pdf'),'10월':month(2,'10월.pdf')}},imports:{'9월':{count:1},'10월':{count:1}}};
  const snapshot={rows:[{name:'가상학생'}],file:'saved',changes:[],manualEvents:[],localState:{mocks:sep.mocks},scoreLibrary:sep};
  // The real bug: old PIN snapshot contains September, live profile received October.
  const first=setup({snapshot,liveLibrary:both,liveState:{mocks:both.mocks}});
  await first.ctx.loginVault();
  assert.equal(first.alerts.length,0,first.alerts.join('; '));
  assert.equal(first.readScores()[name]['9월'].kor,4);
  assert.equal(first.readScores()[name]['10월'].kor,2,'October must survive PIN login');
  assert.equal(JSON.parse(first.db.get(first.LIB)).mocks[name]['10월'].kor,2,'canonical library must not be overwritten');
  await first.ctx.loginVault();
  assert.equal(first.readScores()[name]['10월'].kor,2,'repeat login must remain idempotent');

  // September snapshot restored, yet current local session has no mocks; library remains authoritative.
  const second=setup({snapshot,liveLibrary:both,liveState:{notes:{}}});
  await second.ctx.loginVault();
  assert.equal(second.readScores()[name]['10월'].kor,2);
  assert.equal(second.readScores()[name]['9월'].kor,4);

  // Upgrade migration: if a library does not yet exist, restore snapshot as fallback.
  const third=setup({snapshot,libraryExists:false,liveState:null});
  await third.ctx.loginVault();
  assert.equal(third.readScores()[name]['9월'].kor,4);
  assert.ok(JSON.parse(third.db.get(third.LIB)).mocks[name]['9월']);

  // Explicit deletion should not be undone by an older PIN snapshot.
  const oldWithOctober={...snapshot,scoreLibrary:both,localState:{mocks:both.mocks}};
  const fourth=setup({snapshot:oldWithOctober,liveLibrary:{mocks:{},imports:{}},liveState:{mocks:{}}});
  await fourth.ctx.loginVault();
  assert.equal(fourth.readScores()[name],undefined,'deleted scores must not be resurrected');
  assert.equal(fourth.alerts.length,0);

  console.log('PASS: October survives 2 PIN restarts, September retained, missing-library restore, no resurrection after deletion');
})().catch(e=>{console.error(e);process.exitCode=1});
