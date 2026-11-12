'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const html=fs.readFileSync('app/index.html','utf8').replace(/\r\n/g,'\n');
const start='// ===== v1.0.12: read-once rendering optimization =====';
const end='\nrender();\n\n</script>';
const a=html.indexOf(start), b=html.indexOf(end,a);
assert.ok(a>=0 && b>a, 'render cache wrapper must exist');
const code=html.slice(a+start.length,b);
let reads=0;
const ctx={
  loadLocal(){reads++;return {mocks:{student:{'9월':{kor:1}}}};},
  getMockStore(){return ctx.loadLocal().mocks;},
  availableExamLabels(){return Object.keys(ctx.getMockStore().student);},
  render(){ctx.loadLocal();ctx.getMockStore();ctx.getMockStore();ctx.availableExamLabels();ctx.availableExamLabels();},
  renderMinimum(){ctx.getMockStore();ctx.getMockStore();ctx.availableExamLabels();},
  openMockEditor(){ctx.getMockStore();ctx.getMockStore();},
};
vm.createContext(ctx);
vm.runInContext(code,ctx);
ctx.render();
assert.equal(reads,1,'full render should parse stored scores only once');
ctx.render();
assert.equal(reads,2,'next full render should not reuse previous snapshot');
ctx.renderMinimum();
assert.equal(reads,3,'minimum render should parse stored scores once');
ctx.openMockEditor();
assert.equal(reads,4,'score editor render should parse stored scores once');
ctx.loadLocal();
assert.equal(reads,5,'read outside a render batch must be fresh');
console.log('render cache regression checks passed');
