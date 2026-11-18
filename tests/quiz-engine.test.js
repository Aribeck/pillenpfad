const fs=require('fs');
const code=fs.readFileSync(__dirname+'/../src/data.js','utf8')+'\n'+fs.readFileSync(__dirname+'/../src/engine.js','utf8').replace(/if \(typeof module[\s\S]*$/,'')+'\nreturn {ALL,BY_ID,UNITS,NODES,GEN,genMatch,buildLesson,buildPractice,distractorValues,conflicts,stems};';
const E=new Function(code)();
console.log('drugs',E.ALL.length,'nodes',E.NODES.length);
// dup ids
const ids=E.ALL.map(d=>d.id);console.log('dup ids',ids.filter((x,i)=>ids.indexOf(x)!==i));
// candidate counts per field
const fields={uq:x=>x.uq,g:x=>x.g,nq:x=>x.nq,pq:x=>x.pq,w:x=>x.w};
for(const [f,get] of Object.entries(fields)){
  const low=E.ALL.map(d=>[d.n,E.distractorValues(d,get,99).length]).filter(a=>a[1]<6);
  console.log(f,'low:',JSON.stringify(low));
}
// build all lessons 200x, check
let bad=0,count=0;
for(let r=0;r<200;r++)for(const n of E.NODES){const s=E.buildLesson(n);for(const ex of s){count++;
 if(!ex){bad++;console.log('null in',n.id);continue}
 if(ex.type==='mc'){ if(ex.options.length<3||new Set(ex.options).size!==ex.options.length||!ex.options.includes(ex.answer)){bad++;console.log('badmc',n.id,ex.kind,ex.options)} }
}}
console.log('steps',count,'bad',bad);
// lesson lengths
console.log(E.NODES.map(n=>n.id+':'+E.buildLesson(n).length).join(' '));
