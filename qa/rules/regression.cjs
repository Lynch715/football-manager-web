const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
require('../deadline/shim.cjs');
newWorld(20261022,'Coventry City');const baseline=JSON.stringify(WORLD),results=[];
const originals={rnd,render,processDayEnd,competitionsDayEnd};let experiment;
function reset(){Object.assign(global,originals);adoptWorld(JSON.parse(baseline));clearTimeout(SAVE_TIMER);}
function check(name,fn){try{reset();fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.stack);}finally{clearTimeout(SAVE_TIMER);}}
function fixture(comp='L',day=10){return {day,home:UC().id,away:WORLD.clubs.find(c=>c.id!==UC().id).id,comp,lg:UC().lg,nation:UC().nation,round:1,played:false,hg:0,ag:0};}
function match(f=fixture(),knockout=false){const m=createMatch(f.home,f.away,{comp:f.comp,round:f.round,userSide:0,knockout});m.fixture=f;m.fixtureKey=fixtureKey(f);return m;}
function settle(f){const m=match(f);m.teams.forEach(t=>t.men.forEach(p=>p.mins=90));m.done=true;assert(applyResult(f,m));return m;}
function skills(m,value){for(const k of ['finishing','composure','setpiece','reflex','oneonone'])m.p.a[k]=value;m.p.morale=100;m.p.sharp=100;m.cond=100;}
check('罚球者射门、镇定、定位球及门将反应、单刀分别影响概率',()=>{
 const m=match(),t=m.teams[0].men[1],k=m.teams[1].gk;skills(t,10);skills(k,10);const base=shootoutChance(t,k);
 for(const key of ['finishing','composure','setpiece']){t.p.a[key]=20;assert(shootoutChance(t,k)>base);t.p.a[key]=10;}
 for(const key of ['reflex','oneonone']){k.p.a[key]=20;assert(shootoutChance(t,k)<base);k.p.a[key]=10;}
 assert(base>0.7&&base<0.8);skills(t,200);skills(k,-200);assert.equal(shootoutChance(t,k),.94);skills(t,-200);skills(k,200);assert.equal(shootoutChance(t,k),.35);
});
check('点球读取比赛结束时体能、士气和状态',()=>{const m=match(),t=m.teams[0].men[1],k=m.teams[1].gk;skills(t,15);skills(k,10);const b=shootoutChance(t,k);t.cond=25;assert(shootoutChance(t,k)<b);t.cond=100;t.p.morale=5;assert(shootoutChance(t,k)<b);t.p.morale=100;t.p.sharp=0;assert(shootoutChance(t,k)<b);});
check('相同随机种子的 2000 场点球实验中，强罚球属性提高晋级率',()=>{
 const m=match();let counts=[];
 for(const value of [4,18]){m.teams[0].men.forEach(t=>skills(t,value));m.teams[1].men.forEach(t=>skills(t,10));let wins=0;for(let i=1;i<=2000;i++){seedRng(i);const p=runShootout(m);assert.notEqual(p[0],p[1]);if(p[0]>p[1])wins++;}counts.push(wins);}
 assert(counts[1]>counts[0]+400,JSON.stringify(counts));experiment={samplesPerGroup:2000,lowAttributeWins:counts[0],highAttributeWins:counts[1]};
});
check('只有仍在场球员主罚，人数对齐且轮完全队前不重复，门将在名单内',()=>{
 const m=match(),a=m.teams[0].men,b=m.teams[1].men;a[1].off=true;a[2].off=true;a[2].red=1;b[1].off=true;b[1].injured=true;
 const excluded=new Set([a[1].id,a[2].id,b[1].id]);let i=0;global.rnd=()=>i++<22?0:(i%2?0:.9999);runShootout(m);
 for(const side of [0,1]){const kicks=m.shootout.filter(k=>k.side===side);assert(kicks.every(k=>!excluded.has(k.pid)));assert.equal(new Set(kicks.slice(0,9).map(k=>k.pid)).size,9);assert(kicks.slice(0,9).some(k=>k.pid===m.teams[side].gk.id));assert.equal(kicks[9].pid,kicks[0].pid);}
 assert.equal(m.shootout.length%2,0);
});
check('前五轮可提前结束，突然死亡双方成对罚球，恒定随机序列可终止',()=>{
 let m=match();let i=0;global.rnd=()=>i++%2===0?0:.999;assert.deepEqual(runShootout(m),[3,0]);assert.equal(m.shootout.length,6);
 for(const value of [0,.999]){global.rnd=originals.rnd;m=match();global.rnd=()=>value;const p=runShootout(m);assert.notEqual(p[0],p[1]);assert.equal(m.shootout.length,212);assert.equal(m.shootout.at(-1).attempt,m.shootout.at(-2).attempt);}
});
check('总比分平局触发点球，正常胜负不触发，点球不计入球员和球队进球',()=>{
 let f=fixture('C'),m=match(f,true);m.score=[2,1];m.aggBase=[0,1];m.teams.forEach(t=>t.men.forEach(x=>x.mins=90));endMatch(m);assert(m.pens);assert(m.events.some(e=>e.text.includes('点球大战')));applyResult(f,m);assert.equal(f.hg,2);assert.equal(f.ag,1);assert(f.shootout.length);assert.equal(m.teams.flatMap(t=>t.men).reduce((n,x)=>n+x.p.goals,0),0);assert(!applyResult(f,m));
 m=match(fixture('C'),true);m.score=[0,0];m.aggBase=[1,0];endMatch(m);assert.equal(m.pens,null);
});
check('黄牌累计和红牌处罚分别记入 L/C/CL/EL/PO，旧展示统计保留',()=>{
 const p=P(UC().lineup[1]);p.yellow=4;for(const comp of ['L','C','CL','EL','PO']){for(let i=0;i<4;i++)recordDiscipline(p,comp,{yellow:1,red:0});assert.equal(suspensionFor(p,comp),0);recordDiscipline(p,comp,{yellow:1,red:0});assert.equal(suspensionFor(p,comp),1);recordDiscipline(p,comp,{yellow:0,red:1});assert(suspensionFor(p,comp)>=2&&suspensionFor(p,comp)<=4);}assert.equal(p.yellow,4);
});
check('联赛停赛允许杯赛出场，杯赛不抵消，下一场联赛才服刑',()=>{
 const p=P(UC().lineup[1]),d=disciplineOf(p);d.bans.L=1;const cup=fixture('C',10),league=fixture('L',11);WORLD.fixtures=[cup,league];refreshSuspensions();assert.equal(p.susp,0);assert(match(cup).teams[0].men.some(x=>x.id===p.id));settle(cup);assert.equal(d.bans.L,1);assert.equal(p.susp,1);assert(!match(league).teams[0].men.some(x=>x.id===p.id));settle(league);assert.equal(d.bans.L,0);assert.equal(p.susp,0);
});
check('欧冠、欧联、附加赛处罚不混用且同日不同赛事独立',()=>{
 for(const comp of ['C','CL','EL','PO']){const p=P(UC().squad[1]),d=disciplineOf(p);d.bans={[comp]:2};const league=fixture('L'),other=fixture(comp);WORLD.fixtures=[league,other];settle(league);assert.equal(d.bans[comp],2);settle(other);assert.equal(d.bans[comp],1);}
});
check('自动阵容、修补阵容和手动换人均使用本场赛事资格',()=>{
 const c=UC(),p=P(c.lineup[1]);disciplineOf(p).bans.L=2;autoPickLineup(c,'L');assert(!c.lineup.includes(p.id)&&!c.subs.includes(p.id));c.lineup[1]=p.id;repairLineup(c,true,'L');assert(!c.lineup.includes(p.id));c.lineup[1]=p.id;let m=match(fixture('C'));assert(m.teams[0].men.some(x=>x.id===p.id));const bench=c.subs.find(id=>P(id).pos!=='GK');disciplineOf(P(bench)).bans.L=2;assert(doSub(m,0,m.teams[0].men[2],bench));m=match(fixture('L'));assert(!m.teams[0].men.some(x=>x.id===bench));
});
check('助教自动换人允许其他赛事停赛球员上场，禁止本赛事停赛球员',()=>{
 for(const comp of ['C','L']){global.rnd=originals.rnd;const m=match(fixture(comp)),t=m.teams[0],out=t.men[1],id=UC().subs.find(id=>P(id).pos!=='GK');disciplineOf(P(id)).bans.L=2;UC().subs=[id];out.off=true;out.injured=true;m.t=60;aiSubs(m);assert.equal(t.men.some(x=>x.id===id),comp==='C');}
});
check('双方人数不足的平局弃权直接结束，不进入无球员点球大战',()=>{const f=fixture('C');for(const c of [C(f.home),C(f.away)])c.squad.slice(6).forEach(id=>P(id).injury=20);const m=match(f,true);assert(m.done&&m.forfeit);assert.deepEqual(m.score,[0,0]);assert.equal(m.pens,null);});
check('培养出场机会使用本场赛事停赛资格',()=>{
 const p=P(UC().lineup[1]);disciplineOf(p).bans.L=2;const l=fixture('L'),c=fixture('C');WORLD.fixtures=[l,c];settle(l);assert.equal(clubPlayingTime(p,UC()).available,0);settle(c);assert.equal(clubPlayingTime(p,UC()).available,90);assert.equal(suspensionFor(p,'L'),1);
});
check('新红牌从下一场同赛事服刑，本场不预先抵消',()=>{const f=fixture('C'),g=fixture('L',11);WORLD.fixtures=[f,g];const m=match(f),x=m.teams[0].men[1];x.red=1;x.off=true;x.mins=25;m.done=true;applyResult(f,m);const d=disciplineOf(P(x.id)),n=d.bans.C;assert(n>=1&&n<=3);assert.equal(suspensionFor(P(x.id),'L'),0);settle(g);assert.equal(d.bans.C,n);assert.equal(P(x.id).red,1);});
check('转会和租借保留处罚，跨季保留未服停赛但清零分赛事黄牌',()=>{
 const p=P(UC().lineup[1]),d=disciplineOf(p);d.bans.L=2;d.bans.CL=1;d.yellow.L=4;const host=WORLD.clubs.find(c=>c.id!==UC().id);loanPlayer(p.id,host.id,{});assert.equal(suspensionFor(p,'L'),2);returnLoan(p.id,'recall');assert.equal(suspensionFor(p,'CL'),1);movePlayer(p.id,host.id,0);WORLD.season++;buildSeason();assert.equal(suspensionFor(p,'L'),2);assert.equal(suspensionFor(p,'CL'),1);assert.deepEqual(d.yellow,{});
});
check('旧档无法追溯的停赛保留原规则至服完，不误用旧累计黄牌，重复迁移幂等',()=>{
 const raw=JSON.parse(baseline),p=raw.players[UC().lineup[1]];delete p.discipline;p.susp=2;p.yellow=4;p.injury=9;p.injRecovery=.35;adoptWorld(raw);const q=P(p.id);assert.equal(q.susp,2);assert.equal(q.injury,9);assert.equal(q.injRecovery,.35);assert.equal(q.yellow,4);const saved=JSON.stringify(WORLD);adoptWorld(JSON.parse(saved));assert.equal(JSON.stringify(WORLD),saved);const d=disciplineOf(P(p.id));recordDiscipline(P(p.id),'C',{yellow:1,red:0});assert.equal(d.bans.C,undefined);settle(fixture('C'));assert.equal(d.legacy,1);settle(fixture('L'));assert.equal(d.legacy,0);assert.equal(suspensionFor(P(p.id),'C'),0);
});
check('休赛天数按真实日历处理闰年、延迟赛程和超期赛季',()=>{WORLD.day=304;assert.equal(offseasonDays(),61);WORLD.season=2027;assert.equal(offseasonDays(),62);WORLD.season=2026;WORLD.day=307;assert.equal(offseasonDays(),58);WORLD.day=365;assert.equal(offseasonDays(),0);WORLD.day=380;assert.equal(offseasonDays(),0);});
check('每日和批量康复采用相同医疗工作量与小数余量',()=>{
 const p=P(UC().lineup[1]);UC().physioRating=3;p.injury=120;p.injRecovery=.6;const copy=JSON.parse(JSON.stringify(p));for(let i=0;i<58;i++)recoverInjury(p,1,false);recoverInjury(copy,58,false);assert.equal(p.injury,copy.injury);assert(Math.abs(p.injRecovery-copy.injRecovery)<1e-9);const slow=p.injury;UC().physioRating=20;copy.injury=120;copy.injRecovery=.6;recoverInjury(copy,58,false);assert(copy.injury<slow);
});
check('休赛重伤继续缺阵，轻伤按天数康复，临近开季伤愈不直接满状态',()=>{
 const p=P(UC().lineup[1]);UC().physioRating=10;p.injury=120;p.condition=20;p.sharp=30;offseasonRecovery(p,58);assert.equal(p.injury,62);assert.equal(p.condition,20);assert.equal(p.sharp,30);p.injury=58;p.injRecovery=0;p.condition=40;p.sharp=35;offseasonRecovery(p,58);assert.equal(p.injury,0);assert(p.condition<=55);assert(p.sharp<=20);p.injury=3;p.sharp=40;offseasonRecovery(p,58);assert.equal(p.injury,0);assert(p.condition>=70&&p.sharp>=45);
});
check('零天休赛期不治愈伤病，离队自由球员也按正常医疗康复',()=>{const p=P(UC().lineup[1]);p.injury=50;p.injRecovery=.5;offseasonRecovery(p,0);assert.equal(p.injury,50);assert.equal(p.injRecovery,.5);p.clubId=-1;offseasonRecovery(p,10);assert.equal(p.injury,40);assert.equal(p.injRecovery,.5);});
const file=process.env.FMFILE||path.resolve(__dirname,'../../index.html'),out=path.resolve(__dirname,'../../output/rules');fs.mkdirSync(out,{recursive:true});
const report={passed:results.every(r=>r.passed),checks:results.length,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),experiment,results};fs.writeFileSync(path.join(out,path.basename(file)==='index.html'?'regression-publish.json':'regression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks}));process.exit(report.passed?0:1);
