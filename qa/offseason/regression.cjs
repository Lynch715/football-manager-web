const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('../deadline/shim.cjs');
newWorld(20261024,'Coventry City');const baseline=JSON.stringify(WORLD),results=[];
const originals={rnd,addInterest,weeklyTick,dailyTick,news};
function ready(day=308){
 WORLD.day=day;WORLD.fixtures.forEach(f=>{f.played=true;f.hg=1;f.ag=0;});
 WORLD.cups.forEach(c=>c.winner=WORLD.leagues[lgIndex(c.nation,0)].clubIds[0]);
 Object.values(WORLD.euro).forEach(e=>{e.winner=WORLD.clubs[0].id;e.stage='done';});
 ensurePlayoffs().forEach(p=>{p.started=p.done=true;p.winner=leagueTable(lgIndex(p.nation,p.tier+1))[2].id;p.up16=leagueTable(lgIndex(p.nation,p.tier))[15].id;});
 assert(seasonReady());
}
function player(){const p=P(UC().lineup[1]);p.age=22;p.contract=WORLD.season+5;return p;}
function external(){const p=Object.values(WORLD.players).filter(p=>p.clubId>=0&&p.clubId!==UC().id).sort((a,b)=>b.ca-a.ca)[0];p.age=22;p.contract=WORLD.season+5;return p;}
function medical(left=1,to=4){UC().physioRating=3;UC().projects=[{type:'fac',k:'physioRating',n:'医疗中心',to,left,total:60,cost:1}];}
function check(name,fn){try{Object.assign(global,originals);adoptWorld(JSON.parse(baseline));seedRng(20261024);fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.message.slice(0,300));}finally{clearTimeout(SAVE_TIMER);}}
check('57天休赛继续考察外队球员且饱和到100',()=>{ready();const p=external();WORLD.shortlist=[{id:p.id,know:10}];assert(endSeason());assert.equal(WORLD.shortlist[0].know,100);});
check('球探网络中途竣工按旧新等级分别累计考察',()=>{
 ready(355);const p=external();WORLD.shortlist=[{id:p.id,know:0}];UC().scoutRating=3;
 UC().projects=[{type:'fac',k:'scoutRating',n:'球探网络',to:4,left:4,total:60,cost:1}];
 assert(endSeason());assert(Math.abs(WORLD.shortlist[0].know-(3*3.65+7*4.2))<1e-9);assert.equal(UC().scoutRating,4);
});
check('工程超过休赛长度时按旧球探等级且保留剩余工期',()=>{
 ready(355);const p=external();WORLD.shortlist=[{id:p.id,know:0}];UC().scoutRating=3;
 UC().projects=[{type:'fac',k:'scoutRating',n:'球探网络',to:4,left:11,total:60,cost:1}];
 endSeason();assert(Math.abs(WORLD.shortlist[0].know-36.5)<1e-9);assert.equal(UC().projects[0].left,1);
});
check('医疗中心休赛首日竣工后原48天伤病应伤愈',()=>{ready();const p=player();p.injury=48;p.injRecovery=0;medical();endSeason();assert.equal(UC().physioRating,4);assert.equal(p.injury,0);});
check('医疗中心中途竣工采用分段恢复及原小数余量',()=>{
 ready();const p=player();p.injury=120;p.injRecovery=.6;medical(20);endSeason();
 const work=.6+19*.825+38*.85;assert.equal(p.injury,120-Math.floor(work));assert(Math.abs(p.injRecovery-work%1)<1e-9);
});
check('休赛最后一天竣工仅最后一天使用新医疗等级',()=>{
 ready();const p=player();p.injury=120;p.injRecovery=0;medical(57);endSeason();
 const work=56*.825+.85;assert.equal(p.injury,120-Math.floor(work));assert(Math.abs(p.injRecovery-work%1)<1e-9);
});
check('休赛期未竣工医疗设施不提前提供收益',()=>{ready();const p=player();p.injury=120;p.injRecovery=0;medical(58);endSeason();assert.equal(p.injury,73);assert.equal(UC().physioRating,3);});
check('分段康复与正常逐日施工和医疗的伤病工作量一致',()=>{
 const p=player();p.injury=120;p.injRecovery=.6;medical(20);const initial=JSON.stringify(WORLD);
 for(let d=0;d<57;d++){tickProjects();recoverInjury(p,1,false);}const expected={injury:p.injury,remainder:p.injRecovery};
 adoptWorld(JSON.parse(initial));offseasonRecovery(P(p.id),57);assert.equal(P(p.id).injury,expected.injury);assert(Math.abs(P(p.id).injRecovery-expected.remainder)<1e-9);
});
check('旧工程没有目标等级也按竣工后的医疗等级恢复',()=>{ready();const p=player();p.injury=48;p.injRecovery=0;medical();delete UC().projects[0].to;endSeason();assert.equal(p.injury,0);assert.equal(UC().physioRating,4);});
check('零天休赛保留健康球员体能状态且不消耗随机数',()=>{
 const p=player();p.injury=0;p.condition=100;p.sharp=100;let calls=0;global.rnd=()=>{calls++;return .5;};offseasonRecovery(p,0);assert.equal(p.condition,100);assert.equal(p.sharp,100);assert.equal(calls,0);
});
check('零天休赛保留伤病小数余量及体能状态',()=>{const p=player();p.injury=50;p.injRecovery=.5;p.condition=90;p.sharp=85;offseasonRecovery(p,0);assert.deepEqual([p.injury,p.injRecovery,p.condition,p.sharp],[50,.5,90,85]);});
check('零天跨季不推进球探和工程也不重置体能状态',()=>{
 ready(365);const p=player(),q=external();p.injury=0;p.condition=100;p.sharp=100;WORLD.shortlist=[{id:q.id,know:10}];medical();endSeason();assert.equal(WORLD.shortlist[0].know,10);assert.equal(UC().projects[0].left,1);assert.deepEqual([p.condition,p.sharp],[100,100]);
});
check('5月8日加盟至8月1日只有85天，新援120天保护继续生效',()=>{
 ready();const p=player();p.joinedAbs=WORLD.season*400+280;endSeason();assert.equal(addInterest(p,true),false);
});
check('实际165天的170天关注不因跨季虚增35天而失效',()=>{
 ready();const p=player(),b=WORLD.clubs.find(c=>c.id!==UC().id);WORLD.interest=[{pid:p.id,club:b.id,heat:1,since:WORLD.season*400+200}];endSeason();global.addInterest=()=>false;updateInterest();assert.equal(WORLD.interest.length,1);
});
check('休赛期间超过170天的关注在新季开始时清理',()=>{
 ready();const p=player(),b=WORLD.clubs.find(c=>c.id!==UC().id);WORLD.interest=[{pid:p.id,club:b.id,heat:1,since:WORLD.season*400+190}];endSeason();assert.equal(WORLD.interest.length,0);
});
check('170天关注到期边界及过期关注不能直接生成报价',()=>{
 WORLD.season=2027;WORLD.day=0;const p=player(),b=WORLD.clubs.find(c=>c.id!==UC().id);
 WORLD.interest=[{pid:p.id,club:b.id,heat:1,since:2026*400+195}];
 b.finance.balance=1e12;b.finance.cap0=1e12;b.finance.locked=0;b.squad=b.squad.slice(0,20);p.listed=true;p.askPrice=1000;p.value=500000;p.injury=0;global.rnd=()=>0;
 aiOffersToUser();assert.equal(WORLD.interest.length,0);assert.equal(WORLD.offers.length,0);
});
check('跨季挂牌天数使用真实日历而非400天编码差值',()=>{
 WORLD.season=2027;WORLD.day=30;const p=player();p.listed=true;p.listedAbs=2026*400+280;WORLD.offers=[];
 const notices=[];global.news=(title,body)=>notices.push(body);closeTransferWindow();const text=notices.find(s=>s.includes(p.cn+' 挂牌'));assert(text&&text.includes('挂牌 115 天'),text);
});
check('旧日期字段保持原样，重复读档不推进考察或康复',()=>{
 const p=player(),q=external();p.joinedAbs=2025*400+280;p.createdAbs=2025*400+200;p.listedAbs=2026*400+10;WORLD.shortlist=[{id:q.id,know:12}];medical(40);
 const raw=JSON.stringify(WORLD);adoptWorld(JSON.parse(raw));assert.equal(JSON.stringify(WORLD),raw);adoptWorld(JSON.parse(raw));assert.equal(JSON.stringify(WORLD),raw);assert.equal(WORLD.ver,2);
});
check('日历间隔覆盖同季、平年、闰年、多年和未来日期',()=>{
 assert.equal(elapsedCalendarDays(2026*400+10,2026*400+25),15);
 assert.equal(elapsedCalendarDays(2026*400+280,2027*400),85);
 assert.equal(elapsedCalendarDays(2027*400+280,2028*400),86);
 assert.equal(elapsedCalendarDays(2026*400,2028*400),731);
 assert.equal(elapsedCalendarDays(2028*400,2027*400),0);
 assert.equal(elapsedCalendarDays(undefined),Infinity);
});
check('分段医疗对不同等级、竣工日、轻重伤和余量均与逐日处理一致',()=>{
 const id=player().id,initial=JSON.stringify(WORLD);
 for(const rating of [3,10,19])for(const due of [1,20,57,58])for(const injury of [1,48,120])for(const fraction of [0,.6]){
  adoptWorld(JSON.parse(initial));let p=P(id);p.injury=injury;p.injRecovery=fraction;UC().physioRating=rating;UC().projects=[{type:'fac',k:'physioRating',n:'医疗中心',to:rating+1,left:due,total:60,cost:1}];
  const before=JSON.stringify(WORLD);for(let d=0;d<57;d++){tickProjects();recoverInjury(p,1,false);}
  const expected=[p.injury,p.injRecovery];adoptWorld(JSON.parse(before));p=P(id);offseasonRecovery(p,57);assert.equal(p.injury,expected[0]);assert(Math.abs(p.injRecovery-expected[1])<1e-9);
 }
});
check('休赛不调用每日每周流程，不增加工资赞助或训练结算',()=>{
 ready();UC().squad.map(P).forEach(p=>{p.age=22;p.contract=WORLD.season+5;});let daily=0,weekly=0;global.dailyTick=()=>daily++;global.weeklyTick=()=>weekly++;
 const before=UC().finance.ledger.filter(r=>['周薪支出','商业赞助'].includes(r.memo)).length;
 const attrs=JSON.stringify(UC().squad.map(id=>({id,a:P(id).a,dev:P(id).dev})));endSeason();assert.equal(daily,0);assert.equal(weekly,0);
 assert.equal(UC().finance.ledger.filter(r=>['周薪支出','商业赞助'].includes(r.memo)).length,before);
 assert.equal(JSON.stringify(UC().squad.map(id=>({id,a:P(id).a,dev:P(id).dev}))),attrs);
});
const source=process.env.FMFILE||path.resolve(__dirname,'../../index.html');const report={passed:results.every(r=>r.passed),checks:results.length,source,results};
const out=process.env.QA_OUT||path.resolve(__dirname,'../../output/offseason');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,path.basename(source)==='index.html'?'regression-publish.json':'regression-source.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:results.length}));process.exit(report.passed?0:1);
