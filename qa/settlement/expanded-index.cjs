const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');require('../deadline/shim.cjs');
newWorld(20261103,'Sheffield Wednesday');
const compact=JSON.stringify(WORLD),originals={applyResult,simDay,processDayEnd,prepareDeadlineMarket},results=[];
function expanded(){
 const w=JSON.parse(compact),old=w.leagues,newLeagues=[],indices={};
 [5,4,4,4,4].forEach((count,nation)=>{for(let tier=0;tier<count;tier++){
  const row=old.find(l=>l.nation===nation&&l.tier===tier),lg=newLeagues.length;
  if(row){indices[row.lg]=lg;newLeagues.push({...row,lg});}
  else newLeagues.push({lg,nation,tier,name:'空占位联赛',short:'占位',price:0,prize:[0,0],clubIds:[],rounds:0});
 }});
 w.leagues=newLeagues;
 w.clubs.forEach(c=>{if(c.lg>=0)c.lg=indices[c.lg];else c.nation=21;});
 w.fixtures.forEach(f=>{if(f.lg!=null)f.lg=indices[f.lg];});
 return w;
}
function reset(){Object.assign(global,originals);adoptWorld(expanded());SAVE_ENABLED=false;clearTimeout(SAVE_TIMER);}
function check(name,fn){try{reset();fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.stack);}finally{clearTimeout(SAVE_TIMER);}}
check('扩展联赛编号按国家/级别查询，不按固定下标串联赛',()=>{for(const [n,t,i] of [[0,0,0],[1,0,5],[1,1,6],[2,0,9],[3,0,13],[3,1,14],[4,0,17],[4,1,18]])assert.equal(lgIndex(n,t),i);assert.equal(leagueTable(lgIndex(3,0)).length,18);assert.equal(leagueTable(lgIndex(1,0)).length,20);});
check('赛季未结束不提前启动附加赛；空联赛不被当成已结束',()=>{WORLD.day=92;for(const po of WORLD.playoffs)assert(!poLeaguesDone(po));playoffsDayEnd(92);assert(WORLD.playoffs.every(p=>!p.started));const po={...WORLD.playoffs[4],nation:0,tier:3};assert(!poLeaguesDone(po));const before=JSON.stringify(po);assert.equal(poStart(po,20,92),false);assert.equal(JSON.stringify(po),before);});
check('只撤回完全未开赛、无种子、无球队的附加赛占位，保留所有历史赛果',()=>{const w=expanded(),po=w.playoffs[2];Object.assign(po,{started:true,cur:0,seed:{},byPos:{},rounds:[{ties:[{w:null,days:[271,275]}]}]});w.fixtures.push({day:271,comp:'PO',po:2,round:1,leg:1,played:false});const business=JSON.stringify({players:w.players,clubs:w.clubs,history:w.history,fixtures:w.fixtures.slice(0,-1)});adoptWorld(w);assert(!WORLD.playoffs[2].started);assert.equal(WORLD.playoffs[2].cur,-1);assert.equal(JSON.stringify({players:WORLD.players,clubs:WORLD.clubs,history:WORLD.history,fixtures:WORLD.fixtures}),business);const once=JSON.stringify(WORLD);adoptWorld(JSON.parse(once));assert.equal(JSON.stringify(WORLD),once);});
for(const change of [w=>w.fixtures.at(-1).played=true,w=>w.fixtures.at(-1).home=0,w=>w.playoffs[2].seed[0]=3,w=>w.playoffs[2].rounds[0].ties[0].a=0])check('已有赛果、有效种子或球队时不撤回附加赛：'+change.toString(),()=>{const w=expanded();Object.assign(w.playoffs[2],{started:true,cur:0,rounds:[{ties:[{w:null}]}]});w.fixtures.push({day:271,comp:'PO',po:2,played:false});change(w);const po=JSON.stringify(w.playoffs[2]),fx=JSON.stringify(w.fixtures);adoptWorld(w);assert.equal(JSON.stringify(WORLD.playoffs[2]),po);assert.equal(JSON.stringify(WORLD.fixtures),fx);});
check('外围队伪国家编号变化仍保留欧战身份和原工资系数',()=>{assert.equal(WORLD.clubs.filter(isEuroClub).length,26);for(const c of WORLD.clubs.filter(isEuroClub)){assert.equal(wageF(c),.69);assert.equal(LGN(c),'欧洲其他球队');}const spain=WORLD.clubs.find(c=>c.nation===1&&c.tier===0);assert.equal(wageF(spain),.84);});
for(const fault of ['applyResult','simDay','processDayEnd','prepareDeadlineMarket'])check('结算异常整体回滚并可重试，不重复入账：'+fault,()=>{
 const c=UC(),o=WORLD.clubs.find(x=>x.id!==c.id&&x.nation===c.nation),f={day:92,home:c.id,away:o.id,comp:'L',lg:c.lg,round:13,played:false,hg:0,ag:0};WORLD.fixtures=[f];WORLD.season=2031;WORLD.day=92;
 kickoffUserMatch(f);runMatch(CURMATCH);const m=CURMATCH,before=JSON.stringify(WORLD),rng=RNGSTATE,fin=FIN_CLK;
 global.simDay=()=>{};global.processDayEnd=()=>{};global[fault]=(...args)=>{if(fault==='applyResult')originals.applyResult(...args);UC().finance.balance+=123456;P(UC().squad[0]).apps+=10;WORLD.day++;ri(1,10);throw Error("Cannot read properties of undefined (reading 'id')");};
 let caught;try{finishUserMatch();}catch(e){caught=e;}assert(caught?.matchStage);assert.equal(JSON.stringify(WORLD),before);assert.equal(RNGSTATE,rng);assert.equal(FIN_CLK,fin);assert.equal(CURMATCH,m);assert.equal(m.fixture,WORLD.fixtures[0]);for(const T of m.teams){assert.equal(T.club,C(T.cid));for(const x of T.men)assert.equal(x.p,P(x.id));}
 Object.assign(global,originals);global.simDay=()=>{};global.processDayEnd=()=>{};assert.equal(finishUserMatch(),'ok');assert.equal(WORLD.day,93);assert.equal(FIN_CLK,fin+1);assert(WORLD.fixtures[0].played);
});
check('回滚后仍绑定原赛程索引，不误用相同键的另一记录',()=>{
 const c=UC(),o=WORLD.clubs.find(x=>x.id!==c.id&&x.nation===c.nation),f={day:92,home:c.id,away:o.id,comp:'L',lg:c.lg,round:13,played:false,hg:0,ag:0};WORLD.fixtures=[{...f},f];WORLD.day=92;
 kickoffUserMatch(f);runMatch(CURMATCH);global.simDay=()=>{throw Error('same-day failure');};assert.throws(()=>finishUserMatch());assert.equal(CURMATCH.fixture,WORLD.fixtures[1]);assert(!WORLD.fixtures[0].played&&!WORLD.fixtures[1].played);
});
const report={passed:results.every(r=>r.passed),checks:results.length,results},out=process.env.QA_OUT||path.resolve(__dirname,'../../output/settlement');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'expanded-index.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks}));process.exit(report.passed?0:1);
