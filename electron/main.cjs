'use strict';
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
function makeWindow() {
 const win = new BrowserWindow({
  width:1440,height:920,minWidth:1050,minHeight:680,title:'진학ON',autoHideMenuBar:true,
  webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
 });
 win.webContents.setWindowOpenHandler(({url})=>{
  if(url==='about:blank'||url==='')return {action:'allow'};
  if(url.startsWith('https://'))shell.openExternal(url);
  return {action:'deny'};
 });
 win.webContents.on('will-navigate',(e,url)=>{
  if(url.startsWith('file://')||url==='about:blank')return;
  e.preventDefault();if(url.startsWith('https://'))shell.openExternal(url);
 });
 win.loadFile(path.join(__dirname,'..','app','index.html'));
}
app.whenReady().then(()=>{makeWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)makeWindow()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
