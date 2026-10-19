// Real calendar, match, daily settlement and all three AI quote generators; spies call originals.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
require('./shim.cjs');newWorld(20261019,'Real Madrid');const baseline=JSON.stringify(WORLD),results=[];
const names=['dailyTick','weeklyTick','simDay','marketDaily','aiOffersToUser','aiLoanOffersToUser','pitchReplies'];const originals=Object.fromEntries(names.map(n=>[n,global[n]]));let calls={};
for(const n of names)global[n]=function(...args){calls[n]=(calls[n]||0)+1;return originals[n](...args)};
const query=document.querySelector,queries=document.querySelectorAll;
const stable=()=>crypto.createHash('sha256').update(JSON.stringify({offers:WORLD.offers,finance:WORLD.clubs.map(c=>c.finance),squads:WORLD.clubs.map(c=>c.squad),fixtures:WORLD.fixtures,prepared:WORLD.deadlineMarketKey})).digest('hex');
function reset(winter=false,kind='ai',previousMatch=false,deadlineMatch=false,raw=false,seed=5001){
 adoptWorld(JSON.parse(baseline));seedRng(seed);clearTimeout(SAVE_TIMER);global.toast=()=>{};global.closeModal=()=>{};global.openModal=()=>{};document.querySelector=query;document.querySelectorAll=queries;
 WORLD.day=winter?winterDay():0;const end=windowEndDay();WORLD.day=raw?end:end-1;WORLD.inbox=[];WORLD.offers=[];WORLD.interest=[];WORLD.pitches=[];
 const u=UC(),p=u.squad.map(P).find(p=>p.pos==='ST'&&!p.loan);p.autoSell=false;p.untouchable=false;p.wantsLoan=false;p.injury=0;
 for(let k=0;k<2;k++){const cover=makePlayer(100,p.pos,24,u.id);WORLD.players[cover.id]=cover;u.squad.push(cover.id)}
 const buyers=WORLD.clubs.filter(c=>c.id!==u.id&&c.squad.length<27&&pitchNeed(c,p)>=1).slice(0,8);assert(buyers.length>=2);
 for(const b of buyers){b.finance.balance=1e12;b.finance.locked=0;b.finance.cap0=1e12;}
 p.listed=true;p.askPrice=Math.max(5000,Math.floor(askingPrice(p)*.45/1000)*1000);
 if(kind==='ai')WORLD.interest=buyers.map(b=>({pid:p.id,club:b.id,heat:1,since:absDay()-10}));
 if(kind==='pitch')WORLD.pitches=[{pid:p.id,club:buyers[0].id,price:p.askPrice,day:end-1,due:end}];
 if(kind==='loan'){p.age=22;p.ca=150;p.listed=false;p.wantsLoan=true;for(const b of WORLD.clubs.filter(c=>c.id!==u.id&&c.rep>=55&&c.rep<=70&&c.squad.length<27)){b.finance.balance=1e12;b.finance.locked=0;b.finance.cap0=1e12;}}
 WORLD.fixtures=WORLD.fixtures.filter(f=>f.day!==end&&f.day!==end-1);const games=WORLD.fixtures.filter(f=>!f.played&&f.comp==='L'&&(f.home===u.id||f.away===u.id)&&f.day>end+1);assert(games.length>=2);
 if(previousMatch)games[0].day=end-1;if(deadlineMatch)games[1].day=end;
 calls={};return {end,pid:p.id,u:u.id,kind,previousMatch,deadlineMatch,seed};
}
function step(){const r=advance();if(r.t==='match'){CURMATCH=runMatch(createMatch(r.fx.home,r.fx.away,{record:false,userSide:r.fx.home===WORLD.userClub?0:1,...knockoutOpts(r.fx)}));assert.equal(finishUserMatch(),'ok');assert.equal(CURMATCH,null);}return r.t;}
const quote=x=>WORLD.offers.find(o=>o.pid===x.pid&&o.day===x.end&&(x.kind==='loan'?o.type==='loan':x.kind==='pitch'?o.pitched:!o.pitched&&o.type!=='loan'));
function arrive(winter,kind='ai',prev=false,match=false,raw=false){
 for(let seed=5001;seed<5041;seed++){
  const x=reset(winter,kind,prev,match,raw,seed),before=JSON.stringify(WORLD),rng=RNGSTATE,route=step();
  assert.equal(route,raw?'deadline':prev?'match':'day');assert.equal(WORLD.day,x.end,'must return control on deadline day');const o=quote(x);
  if(o){x.o=o;x.before=before;x.rng=rng;return x;}
 }
 throw Error('No real AI fixture generated the required quote');
}
function close(x){const market=calls.marketDaily;assert.equal(step(),x.deadlineMatch?'match':'day');assert.equal(WORLD.day,x.end+1);assert(!inTransferWindow());assert.equal(calls.marketDaily,market,'deadline market cannot run twice');assert.equal(WORLD.offers.length,0);const list=WORLD.inbox.filter(m=>m.title===(x.end===30?'夏窗':'冬窗')+'关闭');assert.equal(list.length,1);const L=WORLD.transferLog.filter(t=>t.s===WORLD.season&&t.d>x.end-31&&t.d<=x.end);assert(list[0].body.includes(`共完成 ${L.length} 笔转会`));assert(list[0].body.includes(money(L.filter(t=>t.fee>0).reduce((n,t)=>n+t.fee,0))));}
function test(name,fn){if(process.env.TEST_FILTER&&!new RegExp(process.env.TEST_FILTER).test(name))return;try{fn();results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.stack});console.log('FAIL',name,e.message.slice(0,400))}finally{clearTimeout(SAVE_TIMER)}}
for(const winter of [false,true])for(const previousMatch of [false,true])for(const deadlineMatch of [false,true])for(const kind of ['ai','pitch','loan'])test(`${winter?'冬窗':'夏窗'} 前日${previousMatch?'有':'无'}赛/当日${deadlineMatch?'有':'无'}赛 ${kind}完整流程`,()=>{
 const x=arrive(winter,kind,previousMatch,deadlineMatch),o=x.o,bid=o.club,fee=o.fee;
 assert.equal(o.until,x.end);assert.equal(offerDateError(o),'');assert.equal(calls.marketDaily,2);assert.equal(calls.dailyTick,1);assert.equal(calls.simDay,1);assert(!WORLD.inbox.some(m=>m.title===(winter?'冬窗':'夏窗')+'关闭'));
 const snapshot=JSON.stringify(WORLD),protectedBefore=stable();adoptWorld(JSON.parse(snapshot));assert.equal(stable(),protectedBefore,'loading must preserve offers, finances, roster, fixtures and prepared marker');assert.equal(prepareDeadlineMarket(),false);assert.equal(calls.marketDaily,2);
 const seller=UC().finance.balance,buyer=C(bid).finance.balance,logs=WORLD.transferLog.length;
 assert.equal(acceptOffer(WORLD.offers.findIndex(v=>v.pid===x.pid&&v.club===bid)),true);assert.equal(P(x.pid).clubId,bid);assert.equal(UC().finance.balance-seller,fee);assert.equal(buyer-C(bid).finance.balance,fee);assert.equal(WORLD.transferLog.length-logs,1);
 close(x);assert.equal(calls.dailyTick,2);assert.equal(calls.simDay,2);assert.equal(WORLD.transferLog.filter(t=>t.pid===x.pid).length,1);
 if(kind==='loan')assert(!WORLD.inbox.some(m=>m.title===P(x.pid).cn+' 对没被外租感到失望'));
 if(process.env.EXPORT_BROWSER&&!previousMatch&&!deadlineMatch){const dir=path.resolve(__dirname,'../../output/deadline/scenes');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,`${winter?'winter':'summer'}-${kind}.json`),JSON.stringify({world:JSON.parse(x.before),seed:x.seed,rng:x.rng,pid:x.pid,end:x.end}));}
});
for(const winter of [false,true]){
 test(`${winter?'冬':'夏'}窗 旧档直接31日先补报价且读回不重刷`,()=>{const x=arrive(winter,'pitch',false,false,true);assert.equal(calls.marketDaily,1);assert(!calls.dailyTick);const saved=JSON.stringify(WORLD),protectedBefore=stable();adoptWorld(JSON.parse(saved));assert.equal(prepareDeadlineMarket(),false);assert.equal(stable(),protectedBefore);close(x);assert.equal(calls.dailyTick,1)});
 test(`${winter?'冬':'夏'}窗 截止日还价后接受`,()=>{const x=arrive(winter,'pitch');const index=WORLD.offers.indexOf(x.o),v=Math.min(x.o.max,x.o.fee+1000);assert(v>x.o.fee);document.querySelector=s=>s==='#co-fee'?{value:String(v)}:query(s);submitCounter(index);assert(x.o.countered);assert.equal(x.o.until,x.end);assert.equal(acceptOffer(WORLD.offers.indexOf(x.o)),true);close(x)});
 test(`${winter?'冬':'夏'}窗 忽略与拒绝后再次继续关窗`,()=>{for(const reject of [false,true]){const x=arrive(winter,'pitch');if(reject)rejectOffer(WORLD.offers.indexOf(x.o));close(x);assert.equal(P(x.pid).clubId,x.u)}});
 test(`${winter?'冬':'夏'}窗 新到价报价先留给玩家，继续后自动成交一次`,()=>{const x=arrive(winter,'pitch');P(x.pid).autoSell=true;assert(x.o.atAsk);close(x);assert.notEqual(P(x.pid).clubId,x.u);assert.equal(WORLD.transferLog.filter(t=>t.pid===x.pid).length,1)});
 test(`${winter?'冬':'夏'}窗 最后一天新发起推销立即回复且可成交`,()=>{const x=arrive(winter,'pitch'),p=P(x.pid),b=WORLD.clubs.find(c=>c.id!==x.u&&c.id!==x.o.club&&c.squad.length<27&&pitchNeed(c,p)>=1);assert(b);b.finance.balance=1e12;b.finance.locked=0;b.finance.cap0=1e12;document.querySelectorAll=()=>[{checked:true,value:String(b.id)}];sendPitch(x.pid);assert(!WORLD.pitches.some(pt=>pt.pid===x.pid));const i=WORLD.offers.findIndex(o=>o.pid===x.pid&&o.club===b.id);assert(i>=0);assert.equal(acceptOffer(i),true);close(x)});
 test(`${winter?'冬':'夏'}窗 旧档超出窗口有效期也在关窗时清理，关窗汇总不重复`,()=>{const x=arrive(winter,'pitch');x.o.until=x.end+10;close(x);WORLD.day=x.end;closeTransferWindow();assert.equal(WORLD.inbox.filter(m=>m.title===(winter?'冬窗':'夏窗')+'关闭').length,1)});
}
test('普通日期不提前运行次日市场，到期日后报价仍清理',()=>{reset(false,'none');WORLD.day=10;WORLD.fixtures=WORLD.fixtures.filter(f=>f.day!==10);const p=P(UC().squad[1]);WORLD.offers=[{pid:p.id,club:0,day:3,until:10,fee:1,wage:p.wage}];assert.equal(step(),'day');assert.equal(WORLD.day,11);assert.equal(calls.marketDaily,1);assert(!WORLD.offers.some(o=>o.fee===1));assert(!WORLD.deadlineMarketKey)});
const file=process.env.FMFILE||path.resolve(__dirname,'../../index.html');const report={file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),passed:results.every(r=>r.pass),checks:results.length,realAIAndDailyPipeline:true,results};fs.mkdirSync(path.resolve(__dirname,'../../output/deadline'),{recursive:true});fs.writeFileSync(process.env.QA_REPORT||path.resolve(__dirname,'../../output/deadline/regression.json'),JSON.stringify(report,null,2));process.exit(results.some(r=>!r.pass)?1:0);
