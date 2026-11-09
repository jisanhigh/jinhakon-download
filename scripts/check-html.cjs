'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname,'..','app','index.html'),'utf8');
const begin=html.indexOf('<script>');
const end=html.lastIndexOf('</script>');
if(begin<0||end<=begin)throw Error('App JavaScript missing');
const js=html.slice(begin+8,end);
new vm.Script(js,{filename:'app/index.html'});
const checks=[
 ['no sidebar audit', 'onclick="switchView(\'audit\')"'],
 ['version','const APP_VERSION="1.0.9"'],
 ['exact admission','function exactAdmission(r)'],
 ['unique application key','const appKey=r=>["JK2"'],
 ['legacy migration','function jFixMigrateState()'],
 ['manual review','function jFixRenderAudit()'],
 ['annual CSV','function jFixDownloadTemplate()'],
 ['selection mapping','selection:["선발유형"'],
 ['offline SQLite','./vendor/sql-asm.js'],
 ['school PDF class recognition','function reportClassNumber(page,fileName)'],
 ['school PDF grade columns','function reportGradeColumns(page)'],
 ['school PDF format parser','parseNationalPdf=function'],
 ['verified score save','function matchPdfStudentForSave(rec)'],
 ['persistent score readback','저장 후 재조회 결과가 일치하지 않습니다.'],
 ['save result display','명 저장 확인']
];
for(const [name,needle] of checks){if(!html.includes(needle))throw Error('Missing '+name)}
if (html.includes('class="navbtn" data-view="audit"')) throw Error('Audit must not be in sidebar');
if (html.includes('["audit","전형 점검"]')) throw Error('Audit must not be a user-toggle menu');
console.log('v1.0.9 source verified:',checks.map(x=>x[0]).join(', '));
