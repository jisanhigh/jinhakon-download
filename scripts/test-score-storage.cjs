'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','app','index.html'),'utf8');
assert(/const APP_VERSION="1\.0\.\d+";/.test(html),'application version must be defined');
const begin=html.indexOf('function matchPdfStudentForSave(rec){');
const end=html.indexOf('\nfunction scoreLibrarySummary(){',begin);
assert(begin>0&&end>begin);
const source=html.slice(begin,end);
const data=new Map();
let failKey='';
const storage={
  getItem(k){return data.has(k)?data.get(k):null},
  setItem(k,v){if(k===failKey){failKey='';throw Error('storage quota reached')}data.set(k,String(v))},
  removeItem(k){data.delete(k)}
};
const KEY='school-local',libKey='school-lib';
const ctx={
  S:{students:[
    {key:'3|8|1|학생가',name:'학생가',ban:8,no:1},
    {key:'3|8|2|학생나',name:'학생나',ban:8,no:2},
    {key:'3|9|1|학생가',name:'학생가',ban:9,no:1}
  ]},
  KEY,localStorage:storage,savePdfScoreResult:null,
  scoreLibraryKey:()=>libKey,
  readScoreLibrary:()=>JSON.parse(storage.getItem(libKey)||'{"mocks":{},"imports":{}}'),
  getLocalState:()=>JSON.parse(storage.getItem(KEY)||'{}'),
  mergeDeepMocks(a,b){
    const out=JSON.parse(JSON.stringify(a||{}));
    for(const [k,months] of Object.entries(b||{})){
      out[k]=out[k]||{};
      for(const [month,record] of Object.entries(months||{}))
        out[k][month]={...(out[k][month]||{}),...(record||{})};
    }
    return out;
  }
};
ctx.getMockStore=()=>{
  const local=ctx.getLocalState().mocks||{};
  return ctx.mergeDeepMocks(ctx.readScoreLibrary().mocks,local);
};
vm.runInNewContext(source,ctx,{filename:'score-store-from-app.js'});
function grade(name,ban,no,n){
  return {name,ban,no,kor:n,math:3,eng:2,hist:1,inq1:3,inq2:4,korSel:'언어와매체',mathSel:'미적분',inqSel1:'세계지리',inqSel2:'사회문화'};
}
function ingest(month,rows){
  return ctx.savePdfScoreResult({file:'synthetic-'+month+'.pdf',
    exam:{label:month,kind:'전국연합학력평가'},records:rows});
}
const september=ingest('9월',[grade('학생가',8,1,4),grade('학생나',8,2,6)]);
assert.equal(september.verified,2);
const october=ingest('10월',[grade('학생가',8,55,1),grade('학생나',8,2,5)]);
assert.equal(october.verified,2);
assert.equal(october.warnings.length,1,'same-class number mismatch must be flagged');
assert.equal(ctx.getMockStore()['3|8|1|학생가']['9월'].kor,4,'September must be preserved');
assert.equal(ctx.getMockStore()['3|8|1|학생가']['10월'].kor,1,'October must be saved');
assert.equal(ctx.readScoreLibrary().mocks['3|8|2|학생나']['10월'].kor,5);
assert.equal(ctx.getLocalState().mocks['3|8|2|학생나']['10월'].kor,5);
assert.throws(()=>ingest('11월',[grade('학생가',0,0,2)]),/0명/, 'ambiguous names without class must be rejected');
assert.equal(ctx.getMockStore()['3|8|1|학생가']['11월'],undefined);
failKey=KEY;
assert.throws(()=>ingest('12월',[grade('학생나',8,2,2)]),/저장 실패/);
assert.equal(ctx.getMockStore()['3|8|2|학생나']['12월'],undefined,'partial persistence must roll back');
console.log('PASS: 9월 보존, 10월 저장·검증, 반번호 불일치 경고, 동명이인 보호, 실패 시 롤백');
