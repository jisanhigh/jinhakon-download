'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','app','index.html'),'utf8');
const from=html.indexOf('function scheduleLocalDate(');
const to=html.indexOf('function addManualEvent()',from);
const renFrom=html.indexOf('renderSchedule=function(){',to);
const renTo=html.indexOf('const oldRenderStudent=renderStudent;',renFrom);
assert(from>=0&&to>from&&renFrom>to&&renTo>renFrom,'calendar code must be present');
const NativeDate=Date;
function FakeDate(...args){
 return args.length?new NativeDate(...args):new NativeDate(2026,10,9,0,15,0);
}
FakeDate.now=()=>new NativeDate(2026,10,9,0,15,0).valueOf();
FakeDate.UTC=NativeDate.UTC;
FakeDate.parse=NativeDate.parse;
FakeDate.prototype=NativeDate.prototype;
let displayed='',navigation='';
const events=[
 {date:'2026-11-09',type:'면접',cls:'interview',title:'예시',row:{ban:3,no:1,name:'예시학생',university:'가상대학',major:'가상학과'}},
 {date:'2026-11-22',type:'최종발표',cls:'announce',title:'발표',row:null},
 {date:'2026-11-23',type:'논술',cls:'essay',title:'범위 바깥',row:null}
];
const dom={set innerHTML(v){displayed=v;},get innerHTML(){return displayed;}};
const state={
 Date:FakeDate,
 S:{month:new NativeDate(2025,0,1),selectedDay:''},
 $:(selector)=>{assert.equal(selector,'#scheduleView');return dom},
 allEvents:()=>events,
 esc:x=>String(x??''),
 switchView:x=>{navigation=x;return x},
 renderSchedule:()=>{}
};
vm.createContext(state);
vm.runInContext(html.slice(from,to),state,{filename:'calendar-date.js'});
vm.runInContext(html.slice(renFrom,renTo),state,{filename:'calendar-view.js'});
assert.equal(state.scheduleLocalDate(new NativeDate(2026,10,9,23,59)),'2026-11-09','local calendar date');
assert.equal(state.scheduleDatePlusDays('2026-11-09',13),'2026-11-22','two-week range end');
state.jumpCalendarToData();
assert.equal(state.S.month.getFullYear(),2026,'import must use today year');
assert.equal(state.S.month.getMonth(),10,'import must use November, not earliest schedule');
assert.equal(state.S.selectedDay,'2026-11-09','import must select today');
state.renderSchedule();
assert.match(displayed,/2026년 11월/);
assert.match(displayed,/2026-11-09 일정/);
assert.match(displayed,/오늘부터 2주간 일정/);
assert.match(displayed,/가상대학/);
assert.doesNotMatch(state.scheduleUpcomingHtml(events,'2026-11-09'),/범위 바깥/);
assert.match(displayed,/onclick=goTodaySchedule\(\)/,'today button must always be visible');
state.openScheduleDate('2026-11-22');
assert.equal(state.S.selectedDay,'2026-11-22');
assert.match(displayed,/2026-11-22 일정/);
state.S.month=new NativeDate(2027,0,1);state.S.selectedDay='';
state.switchView('schedule');
assert.equal(navigation,'schedule');
assert.equal(state.S.month.getMonth(),10,'re-entering schedule must show current month');
assert.equal(state.S.selectedDay,'2026-11-09','re-entering schedule must select today');
state.goTodaySchedule();
assert.match(displayed,/2026년 11월/);
assert.match(displayed,/2026-11-09 일정/);
console.log('PASS: local today, import reset, tab re-entry, day navigation, always-visible today button, 14-day agenda');
