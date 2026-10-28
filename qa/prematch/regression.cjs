const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('../deadline/shim.cjs');
newWorld(20261028,'Coventry City');
const baseline=JSON.stringify(WORLD),results=[];
const fields=Object.fromEntries(['#modal','#modal-t','#modal-bd','#modal-ft'].map(k=>[k,{innerHTML:'',classList:{add(){},remove(){}}}]));
document.querySelector=k=>fields[k]||null;
global.toggleplay=()=>{};
const originalAdvance=advance;
function reset(){adoptWorld(JSON.parse(baseline));PREMATCH=null;CURMATCH=null;BUSY=false;global.advance=originalAdvance;clearTimeout(SAVE_TIMER);}
function check(name,fn){try{reset();fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.stack);}finally{clearTimeout(SAVE_TIMER);}}
function fixture(comp='L',day=10){const c=UC(),other=WORLD.clubs.find(x=>x.lg===c.lg&&x.id!==c.id);return {day,home:c.id,away:other.id,comp,lg:c.lg,nation:c.nation,round:1,played:false,hg:0,ag:0};}
function setup(comp='L'){const f=fixture(comp);WORLD.fixtures=[f];WORLD.day=f.day;return f;}
check('继续遇到比赛日只展示确认，不创建比赛、不推进日期和赛果',()=>{
 const f=setup(),seed=RNGSTATE,day=WORLD.day;onContinue();assert.equal(CURMATCH,null);assert.equal(WORLD.day,day);assert.equal(RNGSTATE,seed);assert(!f.played);assert.equal(PREMATCH.fx,f);assert(fields['#modal-t'].innerHTML.includes('赛前阵容确认'));assert(fields['#modal-bd'].innerHTML.includes('首发'));assert(fields['#modal-bd'].innerHTML.includes('替补'));
});
check('关闭后确认按钮失效，再继续仍要确认',()=>{const f=setup();onContinue();closeModal();confirmPreMatch();assert.equal(CURMATCH,null);assert.equal(PREMATCH,null);onContinue();assert.equal(PREMATCH.fx,f);assert.equal(WORLD.day,10);});
check('欧战决赛按比赛规则显示中立场地',()=>{const f=setup('CL');Object.assign(f,{stage:'K',round:4,leg:1});startUserMatch(f);assert(fields['#modal-bd'].innerHTML.includes('中立场地'));assert(!fields['#modal-bd'].innerHTML.includes('· 主场'));});
check('换人和战术调整在最终确认后进入实际比赛，重复确认不重开',()=>{
 const f=setup();onContinue();closeModal();const c=UC(),slot=1,incoming=c.subs.find(id=>P(id).pos!=='GK'),out=c.lineup[slot];c.lineup[slot]=incoming;c.subs=c.subs.filter(id=>id!==incoming);c.subs.push(out);c.tactic.tempo=4;const lineup=c.lineup.slice(),bench=c.subs.slice();startUserMatch(f);assert.equal(CURMATCH,null);confirmPreMatch();const m=CURMATCH;assert(m);assert.equal(m.fixture,f);assert.deepEqual(m.teams[0].men.map(p=>p.id),lineup);assert.deepEqual(c.subs,bench);assert.equal(m.teams[0].tac.tempo,4);confirmPreMatch();assert.equal(CURMATCH,m);startUserMatch(f);assert.equal(CURMATCH,m);
});
for(const comp of ['L','C','CL','EL','PO'])check(comp+'赛事均需赛前确认',()=>{const f=setup(comp);if(comp==='PO')WORLD.playoffs=[{fmt:'ENG',rounds:[{legs:1,tb:'pens',ties:[{a:f.home,b:f.away}]}]}];if(comp==='PO')Object.assign(f,{po:0,tie:0,leg:1});startUserMatch(f);assert.equal(CURMATCH,null);assert.equal(PREMATCH.fx,f);confirmPreMatch();assert.equal(CURMATCH.comp,comp);assert.equal(CURMATCH.fixture,f);});
check('伤病和本赛事停赛先替换并说明，疲劳可见，其他赛事停赛不误排除',()=>{
 const f=setup('C'),c=UC(),hurt=P(c.lineup[1]),banned=P(c.lineup[2]),leagueBan=P(c.lineup[3]),tired=P(c.lineup[4]);hurt.injury=7;disciplineOf(banned).bans.C=2;disciplineOf(leagueBan).bans.L=2;tired.condition=55;startUserMatch(f);assert(!c.lineup.includes(hurt.id));assert(!c.lineup.includes(banned.id));assert(c.lineup.includes(leagueBan.id));assert(fields['#modal-bd'].innerHTML.includes('受伤'));assert(fields['#modal-bd'].innerHTML.includes('本场停赛'));assert(fields['#modal-bd'].innerHTML.includes('体能 55%'));assert(fields['#modal-bd'].innerHTML.includes('疲劳'));const shown=c.lineup.slice();confirmPreMatch();assert.deepEqual(CURMATCH.teams[0].men.map(x=>x.id),shown);
});
check('陈旧赛程、换队和换赛季确认不会意外开赛',()=>{for(const change of [f=>f.played=true,f=>f.round++,()=>WORLD.season++,()=>WORLD.userClub=WORLD.clubs.find(c=>c.id!==WORLD.userClub).id,()=>WORLD.fixtures=[]]){reset();const f=setup();startUserMatch(f);change(f);confirmPreMatch();assert.equal(CURMATCH,null);assert.equal(PREMATCH,null);}});
check('未来、非本队、已结束赛程不可弹窗，逾期补赛仍可确认',()=>{const f=setup();f.day=11;startUserMatch(f);assert.equal(PREMATCH,null);f.day=9;startUserMatch(f);assert.equal(PREMATCH.fx,f);closeModal();f.played=true;startUserMatch(f);assert.equal(PREMATCH,null);f.played=false;f.home=f.away;startUserMatch(f);assert.equal(PREMATCH,null);});
check('同日第二场也要重新确认，不能复用上一场确认',()=>{const f=setup(),g={...f,comp:'C'};WORLD.fixtures.push(g);startUserMatch(f);confirmPreMatch();CURMATCH=runMatch(CURMATCH);assert.equal(finishUserMatch(),'pending');assert(f.played&&!g.played);assert.equal(WORLD.day,10);assert.equal(PREMATCH,null);onContinue();assert.equal(CURMATCH,null);assert.equal(PREMATCH.fx,g);});
check('旧档原有名单和历史赛果保持，确认状态不写入存档',()=>{const f=setup(),historical={...f,day:1,played:true,hg:2,ag:1};WORLD.fixtures.unshift(historical);const raw=JSON.stringify(WORLD),lineup=UC().lineup.slice(),bench=UC().subs.slice();adoptWorld(JSON.parse(raw));startUserMatch(WORLD.fixtures[1]);closeModal();assert.deepEqual(UC().lineup,lineup);assert.deepEqual(UC().subs,bench);assert.deepEqual(WORLD.fixtures[0],historical);assert(!JSON.stringify(WORLD).includes('PREMATCH'));adoptWorld(JSON.parse(JSON.stringify(WORLD)));onContinue();assert.equal(CURMATCH,null);assert(PREMATCH);});
const out=process.env.QA_OUT||path.resolve(__dirname,'../../output/prematch');fs.mkdirSync(out,{recursive:true});
const report={passed:results.every(r=>r.passed),checks:results.length,results};fs.writeFileSync(path.join(out,'regression-'+(process.env.FMFILE?'source':'publish')+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks}));process.exit(report.passed?0:1);
