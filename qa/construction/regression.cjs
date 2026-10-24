const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('../deadline/shim.cjs');
newWorld(20261024,'Coventry City');
const baseline=JSON.stringify(WORLD),results=[];
function check(name,fn){
  try{adoptWorld(JSON.parse(baseline));fn();results.push({name,passed:true});console.log('PASS',name);}
  catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.message);}
  finally{clearTimeout(SAVE_TIMER);}
}
function ready(day=304){
  WORLD.day=day;
  WORLD.fixtures.forEach(f=>{f.played=true;f.hg=1;f.ag=0;});
  WORLD.cups.forEach(c=>{c.winner=WORLD.leagues[lgIndex(c.nation,0)].clubIds[0];});
  Object.values(WORLD.euro).forEach(e=>{e.winner=WORLD.clubs[0].id;e.stage='done';});
  ensurePlayoffs().forEach(p=>{
    p.started=p.done=true;
    p.winner=leagueTable(lgIndex(p.nation,p.tier+1))[2].id;
    p.up16=leagueTable(lgIndex(p.nation,p.tier))[15].id;
  });
  assert(seasonReady());
}
function seed(c,left=100){
  c.coachRating=10;c.physioRating=10;c.scoutRating=10;c.youthRating=10;c.cap=30000;
  c.projects=[...FACILITIES.map(f=>({type:'fac',k:f.k,n:f.n,to:11,left,total:left,cost:123})),
    {type:'stad',n:'球场扩建',seats:5000,left,total:left,cost:456}];
}
check('赛季内每日建设仍只推进一天且不重复扣款',()=>{
  const c=UC();seed(c);const cash=c.finance.balance;dailyTick();
  assert(c.projects.every(p=>p.left===99));assert.equal(c.finance.balance,cash);
});
check('批量建设推进与逐日推进结果一致，竣工仅结算一次',()=>{
  seed(UC(),2);const initial=JSON.stringify(WORLD);tickProjects(3);
  const batch=JSON.stringify({c:UC(),inbox:WORLD.inbox});adoptWorld(JSON.parse(initial));
  for(let i=0;i<3;i++)tickProjects();
  assert.equal(JSON.stringify({c:UC(),inbox:WORLD.inbox}),batch);
  assert.equal(UC().cap,35000);assert.equal(UC().projects.length,0);
  const newsCount=WORLD.inbox.length;tickProjects(60);assert.equal(WORLD.inbox.length,newsCount);
});
check('零天休赛不改变建设进度或提前触发竣工',()=>{
  seed(UC(),1);const before=JSON.stringify(UC());tickProjects(0);assert.equal(JSON.stringify(UC()),before);
});
for(const [season,day,rest] of [[2026,304,61],[2027,304,62],[2026,307,58],[2026,365,0],[2026,380,0]]){
  check(`${season}年第${day}天跨季按实际休赛${rest}天推进全部俱乐部工程`,()=>{
    WORLD.season=season;ready(day);const clubs=[UC(),WORLD.clubs.find(c=>c.id!==UC().id)];
    clubs.forEach(c=>seed(c,100));assert.equal(offseasonDays(),rest);
    assert(endSeason());assert.equal(WORLD.season,season+1);assert.equal(WORLD.day,0);
    for(const c of clubs){assert.equal(c.projects.length,5);assert(c.projects.every(p=>p.left===100-rest));}
  });
}
check('休赛竣工立即升级四类设施、球场容量和声望，长工程保留剩余工期',()=>{
  ready();const c=UC();seed(c,61);c.projects[3].left=90;c.projects[3].total=90;
  const rep=c.rep;assert(endSeason());
  for(const k of ['coachRating','physioRating','scoutRating'])assert.equal(c[k],11);
  assert.equal(c.youthRating,10);assert.equal(c.cap,35000);assert.equal(c.rep,clamp(rep+1,1,100));
  assert.equal(c.projects.length,1);assert.equal(c.projects[0].left,29);
  const completed=WORLD.inbox.filter(n=>/升级完成|球场扩建竣工/.test(n.title));assert.equal(completed.length,4);
  assert(completed.every(n=>n.d===0));const cap=c.cap;tickProjects();assert.equal(c.cap,cap);assert.equal(c.projects[0].left,28);
});
check('新赛季AI新开工程不被追扣上个休赛期工期',()=>{
  ready();const c=WORLD.clubs.find(c=>c.id!==UC().id);c.projects=[];c.finance.balance=1e12;
  assert(endSeason());assert(c.projects.length>0);assert(c.projects.every(p=>p.left===p.total));
});
check('未完成赛程拒绝结季时不扣建设天数',()=>{
  seed(UC());const before=JSON.stringify(UC().projects);assert.equal(endSeason(),false);
  assert.equal(JSON.stringify(UC().projects),before);
});
check('旧工程缺少目标等级仍可竣工，读档不补扣工期且重复读档幂等',()=>{
  ready();seed(UC(),30);delete UC().projects[0].to;
  const before=JSON.stringify(UC().projects),raw=JSON.stringify(WORLD);adoptWorld(JSON.parse(raw));
  assert.equal(JSON.stringify(UC().projects),before);const once=JSON.stringify(WORLD);
  adoptWorld(JSON.parse(once));assert.equal(JSON.stringify(WORLD),once);
  assert(endSeason());assert.equal(UC().coachRating,11);assert.equal(UC().projects.length,0);
  const saved=JSON.stringify(WORLD);adoptWorld(JSON.parse(saved));assert.equal(JSON.stringify(WORLD),saved);
});
const source=process.env.FMFILE||path.resolve(__dirname,'../../index.html');
const report={passed:results.every(r=>r.passed),checks:results.length,source,results};
const out=process.env.QA_OUT||path.resolve(__dirname,'../../output/construction');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,path.basename(source)==='index.html'?'regression-publish.json':'regression-source.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,checks:results.length}));process.exit(report.passed?0:1);
