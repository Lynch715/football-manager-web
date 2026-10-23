const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('../deadline/shim.cjs');
newWorld(20261023,'Coventry City');const baseline=JSON.stringify(WORLD),results=[];
const originals={rnd,ri,news};
function reset(){Object.assign(global,originals);adoptWorld(JSON.parse(baseline));clearTimeout(SAVE_TIMER);}
function check(name,fn){try{reset();fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.stack);}finally{clearTimeout(SAVE_TIMER);}}
function player(age=17){const p=makePlayer(48,'MC',age,UC().id);p.pa=170;p.prof=11;p.contract=WORLD.season+10;WORLD.players[p.id]=p;UC().squad=[p.id];return p;}
function ledger(p,share=0.8,games=38){const u=playingTimeOf(p);u.total={minutes:games*90*share,available:games*90,games};u.clubs[p.clubId]={...u.total};}
function fx(day=10,comp='L'){return {day,comp,home:UC().id,away:WORLD.clubs.find(c=>c.id!==UC().id).id,played:false};}
function record(f,p,mins=90){recordPlayingTime(f,{teams:[{men:[{id:p.id,mins}]},{men:[]}]});f.played=true;}
const intakeDay=()=>Math.round((new Date(WORLD.season+1,2,20)-dateOf(0))/864e5);
check('3月青训创建日期准确，入队前比赛不计入培养分母',()=>{
 const oldIds=new Set(Object.keys(WORLD.players));WORLD.day=intakeDay();WORLD.fixtures=Array.from({length:30},(_,day)=>({...fx(day),played:true}));
 youthIntake();const newcomers=UC().squad.map(P).filter(p=>!oldIds.has(String(p.id)));
 assert(newcomers.length>=3);for(const p of newcomers){assert.equal(p.createdAbs,absDay());assert.equal(trainingShare(p,UC()),.6);assert.equal(playingTimeOf(p).total.available,0);}
 recordPlayingTime(fx(WORLD.day+1),{teams:[{men:newcomers.map(p=>({id:p.id,mins:90}))},{men:[]}]});for(const p of newcomers)assert.equal(playShare(p),1);
});
check('3月新人季末不因短样本下调或上调潜力',()=>{
 WORLD.day=intakeDay();const p=player();ledger(p,0,9);const pa=p.pa;WORLD.day=310;p.age++;global.rnd=()=>0;prospectFate(p);assert.equal(p.pa,pa);global.rnd=()=>.02;prospectFate(p);assert.equal(p.pa,pa);
});
check('新赛季重新累计完整机会，次年正常参加年度评价',()=>{
 WORLD.day=intakeDay();const p=player();WORLD.season++;WORLD.day=300;p.age++;ledger(p,0,38);global.rnd=()=>0;global.ri=()=>4;const pa=p.pa;prospectFate(p);assert.equal(p.pa,pa-4);assert.equal(developmentDays(p),300);
});
check('半年和12场样本边界，伤停少样本不误判',()=>{
 const p=player();global.rnd=()=>0;global.ri=()=>4;ledger(p,0,12);WORLD.day=179;prospectFate(p);assert.equal(p.pa,170);WORLD.day=180;ledger(p,0,11);prospectFate(p);assert.equal(p.pa,170);ledger(p,0,12);prospectFate(p);assert.equal(p.pa,166);
});
check('随机年度下调幅度收敛，低出场仍比主力更易停滞',()=>{
 const p=player();WORLD.day=300;global.rnd=()=>.04;global.ri=()=>12;ledger(p,1);prospectFate(p);assert(p.pa>=170);p.pa=170;ledger(p,0);prospectFate(p);assert(p.pa>=158&&p.pa<=166);
});
check('23岁全面开放普通球员成长空间，传奇22岁仍领先',()=>{
 const p=player(22);assert(devCap(p)<p.pa);p.age=23;assert(devCap(p)>=p.pa);p.age=22;p.legend=true;assert(devCap(p)>=p.pa);
});
check('24至27岁不再按年龄削减潜力，28岁起温和收拢并刷新身价',()=>{
 const p=player();ledger(p);WORLD.day=300;global.rnd=()=>.99;for(const age of [24,25,26,27]){p.age=age;prospectFate(p);assert.equal(p.pa,170);}p.age=28;prospectFate(p);assert(p.pa<170&&p.pa>150);assert.equal(p.value,calcValue(p));
});
check('23岁停滞旧球员仍可在27岁前继续成长',()=>{
 const p=player(23);fitAttrsToOverall(p.a,p.pos,140);p.ca=calcCA(p.a,p.pos);p.ca0=85;const ca=p.ca;UC().coachRating=14;UC().trainIntensity=2;UC().trainFocus='balanced';
 for(let y=0;y<4;y++){WORLD.season=2026+y;p.age=23+y;ledger(p,.8);for(let w=0;w<44;w++){WORLD.day=w*7;trainClub(UC());}}
 assert(p.ca>=ca+15);assert(p.ca<=p.pa);assert(p.pa===170);
});
check('训练进度撞到年龄上限时保留，不反复白白消耗',()=>{
 const p=player(16);p.ca0=p.ca;const cap=devCap(p);fitAttrsToOverall(p.a,p.pos,Math.floor(cap));p.ca=calcCA(p.a,p.pos);p.pa=p.ca;p.dev=1;const attrs=JSON.stringify(p.a);UC().trainFocus='balanced';trainClub(UC());assert.equal(p.dev,1);assert.equal(JSON.stringify(p.a),attrs);
});
check('教练、出场、训练态度、强度和伤病仍影响培养速度',()=>{
 const base=JSON.stringify(player(23));
 function run({coach=11,prof=11,share=.8,intensity=2,injury=0}={}){const p=JSON.parse(base);WORLD.players[p.id]=p;UC().squad=[p.id];UC().coachRating=coach;UC().trainIntensity=intensity;UC().trainFocus='balanced';p.prof=prof;p.injury=injury;ledger(p,share);seedRng(2026);for(let i=0;i<40;i++)trainClub(UC());return p.ca+(p.dev||0)*.01;}
 assert(run({coach:18})>run({coach:4}));assert(run({prof:18})>run({prof:4}));assert(run()>run({share:0}));assert(run({intensity:4})>run({intensity:0}));assert(run()>run({injury:10}));assert.equal(Math.floor(run({injury:30})),JSON.parse(base).ca);
});
check('高潜力、低潜力、各位置及老化属性均在边界内',()=>{
 for(const pos of POSITIONS)for(const age of [16,23,27,31]){const p=player(age);p.pos=pos;p.ca=calcCA(p.a,pos);p.ca0=p.ca;p.pa=p.ca+1;ledger(p);for(let i=0;i<80;i++)trainClub(UC());assert(p.ca<=p.pa);assert(Number.isFinite(p.dev));assert(Object.values(p.a).every(v=>Number.isFinite(v)&&v>=1&&v<=20));}
});
check('传奇最高两倍加速、无出场不加速的原规则保留',()=>{const p=player();p.legend=true;p.apps=0;assert.equal(legendGrowthBoost(p,1),1);p.apps=1;assert.equal(legendGrowthBoost(p,1),2);p.age=28;assert.equal(legendGrowthBoost(p,1),1);});
check('转会、租借及伤停只累计实际有资格的机会',()=>{
 const p=player(),c=UC(),host=WORLD.clubs.find(x=>x.id!==c.id);record(fx(),p,45);assert.equal(playShare(p),.5);p.injury=30;record(fx(20),p,0);assert.equal(playingTimeOf(p).total.games,1);p.injury=0;loanPlayer(p.id,host.id,{minApps:.6});assert.equal(trainingShare(p,host),.6);const f={...fx(30),home:host.id,away:c.id};recordPlayingTime(f,{teams:[{men:[{id:p.id,mins:90}]},{men:[]}]});assert.equal(trainingShare(p,host),1);assert.equal(playShare(p),.75);
});
check('旧档无出道日时从升级日起观察，不猜测原日期；重复载入幂等',()=>{
 const w=JSON.parse(baseline);w.day=280;delete w.developmentV2;Object.values(w.players).forEach(p=>delete p.createdAbs);
 const business=x=>JSON.stringify({players:Object.values(x.players).map(p=>({id:p.id,ca:p.ca,pa:p.pa,apps:p.apps,wage:p.wage,contract:p.contract})),fixtures:x.fixtures,finances:x.clubs.map(c=>c.finance)});
 const before=business(w);adoptWorld(w);assert.equal(business(WORLD),before);const p=P(UC().squad[0]);assert.equal(developmentDays(p),0);const saved=JSON.stringify(WORLD);adoptWorld(JSON.parse(saved));assert.equal(JSON.stringify(WORLD),saved);
});
check('旧青训不可信历史分母清除，已精确计时的记录保留',()=>{
 const p=player(),q=makePlayer(48,'ST',17,UC().id);WORLD.players[q.id]=q;UC().squad.push(q.id);p.homegrown=q.homegrown=true;ledger(p,.2);ledger(q,.8);playingTimeOf(p).total.legacy=true;
 const exact=JSON.stringify(q.playingTime),apps=p.apps=9;delete WORLD.developmentV2;migrateDevelopment();assert.equal(p.apps,apps);assert.equal(playingTimeOf(p).total.available,0);assert.equal(JSON.stringify(q.playingTime),exact);
});
const source=process.env.FMFILE||path.resolve(__dirname,'../../index.html'),report={passed:results.every(r=>r.passed),checks:results.length,source,results};
const out=path.resolve(__dirname,'../../output/growth');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,path.basename(source)==='index.html'?'regression-publish.json':'regression-source.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,checks:results.length}));process.exit(report.passed?0:1);
