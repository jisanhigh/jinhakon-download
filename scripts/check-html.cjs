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
 ['version','const APP_VERSION="1.0.6"'],
 ['exact admission','function exactAdmission(r)'],
 ['unique application key','const appKey=r=>["JK2"'],
 ['legacy migration','function jFixMigrateState()'],
 ['manual review','function jFixRenderAudit()'],
 ['annual CSV','function jFixDownloadTemplate()'],
 ['selection mapping','selection:["선발유형"'],
 ['offline SQLite','./vendor/sql-asm.js']
];
for(const [name,needle] of checks){if(!html.includes(needle))throw Error('Missing '+name)}
console.log('v1.0.6 source verified:',checks.map(x=>x[0]).join(', '));
