const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('../deadline/shim.cjs');
newWorld(20261103,'Sheffield Wednesday');
const baseline=JSON.stringify(WORLD), results=[];
const originals={render,autoSave,showPostMatch,toast,processDayEnd,simDay,consoleError:console.error};
const fields=Object.fromEntries(['#modal','#modal-t','#modal-bd','#modal-ft'].map(k=>[k,{innerHTML:'',classList:{add(){},remove(){}}}]));
document.querySelector=k=>fields[k]||null;
let saved,shown,messages;
function reset(){
  Object.assign(global,{render:originals.render,processDayEnd:originals.processDayEnd,simDay:originals.simDay});
  adoptWorld(JSON.parse(baseline));SAVE_ENABLED=false;clearTimeout(SAVE_TIMER);PREMATCH=null;BUSY=false;
  saved=shown=0;messages=[];
  global.autoSave=()=>{saved++;};global.showPostMatch=()=>{shown++;};global.toast=m=>messages.push(m);
}
function check(name,fn){try{reset();fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.stack);}finally{console.error=originals.consoleError;clearTimeout(SAVE_TIMER);}}
function fixture({comp='CL',day=10,round=1,old=false,away=false}={}){
  const c=UC(),o=WORLD.clubs.find(x=>x.id!==c.id&&x.lg===c.lg);
  const f={day,home:away?o.id:c.id,away:away?c.id:o.id,comp,lg:c.lg,nation:c.nation,played:false,hg:0,ag:0};
  if(!old)f.round=round;
  if(comp==='CL'||comp==='EL')Object.assign(f,{stage:'G',grp:0});
  if(comp==='PO'){Object.assign(f,{po:0,tie:0,leg:1});WORLD.playoffs=[{fmt:'ENG',started:true,done:false,cur:0,rounds:[{legs:1,tb:'pens',ties:[{a:f.home,b:f.away}]}]}];}
  WORLD.fixtures=[f];WORLD.day=day;return f;
}
function kickoff(f){kickoffUserMatch(f);assert(CURMATCH);runMatch(CURMATCH);assert(CURMATCH.done);return CURMATCH;}
function progress(){return JSON.stringify({season:WORLD.season,day:WORLD.day,club:WORLD.userClub,fixtures:WORLD.fixtures,players:WORLD.players,clubs:WORLD.clubs,history:WORLD.history});}
function noDayEnd(){global.simDay=()=>{};global.processDayEnd=()=>{};}
function settleOnce(f,m=CURMATCH){
  noDayEnd();const day=WORLD.day,apps=P(m.teams[0].men[0].id).apps,fin=FIN_CLK;
  const historical=JSON.stringify(WORLD.fixtures.filter(x=>x.played));
  completeMatch();assert(f.played);assert.equal(CURMATCH,null);assert.equal(WORLD.day,day+1);assert.equal(saved,1);assert.equal(shown,1);assert.equal(FIN_CLK,fin+1);
  assert.equal(P(m.teams[0].men[0].id).apps,apps+1);assert.equal(JSON.stringify(WORLD.fixtures.filter(x=>x!==f&&x.played)),historical);
  const after=progress();completeMatch();assert.equal(progress(),after);assert.equal(saved,1);assert.equal(shown,1);
}
for(const comp of ['L','C','CL','EL'])for(const away of [false,true])check(comp+'旧档缺少轮次，'+(away?'客场':'主场')+'可结算且不重复入账',()=>{const f=fixture({comp,away,old:true});settleOnce(f,kickoff(f));assert(!Object.hasOwn(f,'round'));});
for(const comp of ['L','C','CL','EL','PO'])check(comp+'有轮次的正常比赛仍可结算',()=>{const f=fixture({comp});settleOnce(f,kickoff(f));});
check('round:null 的旧赛程仍可结算',()=>{const f=fixture();f.round=null;settleOnce(f,kickoff(f));assert.equal(f.round,null);});
check('JSON 重建赛程后按完整键找回原比赛，保持赛果及球员统计',()=>{const f=fixture();const m=kickoff(f);const originalScore=m.score.slice();WORLD.fixtures=JSON.parse(JSON.stringify(WORLD.fixtures));const copy=WORLD.fixtures[0];assert.notEqual(copy,f);assert.equal(fixtureForMatch(m),copy);settleOnce(copy,m);assert.deepEqual([copy.hg,copy.ag],originalScore);assert(!f.played);});
check('旧档缺轮次且赛程对象被重建，可唯一匹配并结算',()=>{const f=fixture({old:true});const m=kickoff(f);WORLD.fixtures=WORLD.fixtures.map(x=>({...x}));settleOnce(WORLD.fixtures[0],m);});
check('同队同日不同赛事和不同回合不会串场，逾期补赛可结算',()=>{const f=fixture({day:8});const g={...f,comp:'L'},h={...f,leg:2};WORLD.fixtures.push(g,h);WORLD.day=10;const m=kickoff(f);WORLD.fixtures=WORLD.fixtures.map(x=>({...x}));const target=WORLD.fixtures[0];assert.equal(fixtureForMatch(m),target);noDayEnd();assert.equal(finishUserMatch(),'pending');assert(target.played);assert(!WORLD.fixtures[1].played&&!WORLD.fixtures[2].played);assert.equal(WORLD.day,10);});
check('旧比赛无绑定信息时，只匹配唯一的同赛事同轮次',()=>{const f=fixture(),m=kickoff(f);delete m.fixture;delete m.fixtureKey;delete m.fixtureSeason;WORLD.fixtures.push({...f,comp:'L'});assert.equal(fixtureForMatch(m),f);noDayEnd();assert.equal(finishUserMatch(),'pending');assert(f.played&&!WORLD.fixtures[1].played);});
check('旧比赛无轮次、无绑定信息时可匹配唯一同赛事候选',()=>{const f=fixture(),m=kickoff(f);delete m.fixture;delete m.fixtureKey;delete m.fixtureSeason;delete m.round;assert.equal(fixtureForMatch(m),f);settleOnce(f,m);});
check('没有同赛事候选时禁止降级匹配另一项赛事',()=>{const f=fixture(),m=kickoff(f);delete m.fixture;delete m.fixtureKey;delete m.round;f.comp='L';const before=progress();assert.equal(fixtureForMatch(m),null);assert.throws(()=>finishUserMatch());assert.equal(progress(),before);assert.equal(CURMATCH,m);});
check('失去对象引用且存在多个完全相同候选时不猜测',()=>{const f=fixture(),m=kickoff(f);WORLD.fixtures=[{...f},{...f}];const before=progress();assert.equal(fixtureForMatch(m),null);assert.throws(()=>finishUserMatch());assert.equal(progress(),before);});
for(const change of [f=>f.day++,f=>f.round++,f=>f.comp='L',f=>f.stage='K',f=>f.leg=2,f=>f.tie=3,()=>WORLD.fixtures=[],()=>WORLD.season++,f=>f.played=true,()=>WORLD.userClub=-1])check('被改动、已结算或跨季赛程被拒绝：'+change.toString(),()=>{const f=fixture(),m=kickoff(f);change(f);const before=progress();assert.equal(fixtureForMatch(m),null);assert.throws(()=>finishUserMatch());assert.equal(progress(),before);assert.equal(CURMATCH,m);});
check('未来赛程无法被结算',()=>{const f=fixture(),m=kickoff(f);WORLD.day=9;assert.equal(fixtureForMatch(m),null);assert.throws(()=>finishUserMatch());assert.equal(CURMATCH,m);assert(!f.played);});
check('未结束比赛点击完成时显示提示，不抛出脚本错误、不保存或推进',()=>{const f=fixture();kickoffUserMatch(f);const m=CURMATCH,before=progress();console.error=()=>{};assert.doesNotThrow(()=>completeMatch());assert.equal(progress(),before);assert.equal(CURMATCH,m);assert.equal(saved,0);assert.equal(shown,0);assert(messages.some(x=>x.includes('暂未结算')));});
check('赛程失效时保留未结算比赛，不保存、不推进、不吞掉提示',()=>{const f=fixture(),m=kickoff(f);f.round++;const before=progress();console.error=()=>{};assert.doesNotThrow(()=>completeMatch());assert.equal(progress(),before);assert.equal(CURMATCH,m);assert.equal(saved,0);assert.equal(shown,0);assert.equal(messages.length,1);});
check('顶部继续使用相同修复路径，缺轮次旧档不会卡住',()=>{const f=fixture({old:true});kickoff(f);noDayEnd();onContinue();assert(f.played);assert.equal(WORLD.day,11);assert.equal(CURMATCH,null);assert.equal(BUSY,false);assert.equal(saved,1);});
check('实际日末推进可正常执行且只执行一次',()=>{const f=fixture({old:true});kickoff(f);const tick=originals.processDayEnd;let ticks=0;global.processDayEnd=day=>{ticks++;tick(day);};global.simDay=()=>{};completeMatch();assert(f.played);assert.equal(WORLD.day,11);assert.equal(ticks,1);const after=progress();completeMatch();assert.equal(ticks,1);assert.equal(progress(),after);});
check('保留历史比赛、球队财政、球员数据与2031赛季进度，导入迁移幂等',()=>{
  const f=fixture({old:true});WORLD.season=2031;WORLD.day=92;f.day=92;
  const past={...f,day:80,played:true,hg:3,ag:1};WORLD.fixtures.unshift(past);
  const raw=JSON.stringify(WORLD),before=progress();adoptWorld(JSON.parse(raw));SAVE_ENABLED=false;assert.equal(progress(),before);assert.equal(WORLD.ver,2);assert.equal(WORLD.season,2031);assert.equal(WORLD.day,92);assert(!Object.hasOwn(WORLD.fixtures[1],'round'));
  const savedWorld=JSON.stringify(WORLD);adoptWorld(JSON.parse(savedWorld));SAVE_ENABLED=false;assert.equal(JSON.stringify(WORLD),savedWorld);
  const target=WORLD.fixtures[1],m=kickoff(target);assert.equal(JSON.stringify(WORLD).includes('fixtureSeason'),false);settleOnce(target,m);assert.deepEqual(WORLD.fixtures[0],past);
});
const source=process.env.FMFILE||path.resolve(__dirname,'../../index.html'),out=process.env.QA_OUT||path.resolve(__dirname,'../../output/settlement');fs.mkdirSync(out,{recursive:true});
const report={passed:results.every(r=>r.passed),checks:results.length,source,results};fs.writeFileSync(path.join(out,path.basename(source)==='index.html'?'regression-publish.json':'regression-source.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks}));process.exit(report.passed?0:1);
