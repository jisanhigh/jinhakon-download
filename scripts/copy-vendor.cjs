'use strict';
const fs=require('node:fs'),path=require('node:path');
const from=require.resolve('sql.js/dist/sql-asm.js');
const folder=path.join(__dirname,'..','app','vendor');
fs.mkdirSync(folder,{recursive:true});
fs.copyFileSync(from,path.join(folder,'sql-asm.js'));
console.log('Bundled offline SQLite: app/vendor/sql-asm.js');
