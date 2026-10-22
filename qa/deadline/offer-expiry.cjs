const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
if(process.argv[2])process.env.FMFILE=path.resolve(process.argv[2]);
require('./shim.cjs');
newWorld(4242,'Coventry City');
const base=JSON.stringify(WORLD),results=[],query=document.querySelector;
const originals={marketDaily,simDay,dailyTick,weeklyTick,faSigningRound,aiAcceptLoanTerms};
let messages=[],opened=[];
function reset(winter=false){
  Object.assign(global,originals);document.querySelector=query;
  adoptWorld(JSON.parse(base));seedRng(4242);WORLD.day=winter?winterDay():0;WORLD.day=windowEndDay();
  global.closeModal=()=>{};global.openModal=(...args)=>opened.push(args);global.toast=m=>messages.push(m);messages=[];opened=[];
  const u=UC(),p=u.squad.map(P).find(p=>p.pos!=='GK'&&!p.loan),b=WORLD.clubs.find(c=>c.id!==u.id&&c.squad.length<27);
  b.finance.balance=1e12;b.finance.cap0=1e12;p.autoSell=false;
  const o={pid:p.id,club:b.id,fee:1e6,max:1.5e6,wage:p.wage,day:WORLD.day-1,until:WORLD.day};
  WORLD.offers=[o];clearTimeout(SAVE_TIMER);return {u,p,b,o,end:WORLD.day};
}
const form=data=>document.querySelector=s=>s in data?{value:String(data[s])}:query(s);
function test(name,fn){fn();clearTimeout(SAVE_TIMER);results.push({name,pass:true});console.log('PASS',name);}
function sold({u,p,b,o},fee=o.fee){
  const a=u.finance.balance,z=b.finance.balance,logs=WORLD.transferLog.length;
  assert.equal(acceptOffer(0),true,messages.join(';'));assert.equal(p.clubId,b.id);assert(!u.squad.includes(p.id));assert(b.squad.includes(p.id));
  assert.equal(u.finance.balance-a,fee);assert.equal(z-b.finance.balance,fee);assert.equal(WORLD.transferLog.length,logs+1);
  assert(!WORLD.offers.some(x=>x.pid===p.id));assert(!acceptOffer(0));assert.equal(WORLD.transferLog.length,logs+1);
}
for(const winter of [false,true]){
  const label=winter?'冬窗1/31':'夏窗8/31';
  test(label+' 到期日手动成交，球员、资金、日志各结算一次',()=>sold(reset(winter)));
  test(label+' AI当天生成的新报价立即可成交',()=>{
    const x=reset(winter);WORLD.offers=[];x.p.listed=true;x.p.askPrice=100000;
    WORLD.interest=[{pid:x.p.id,club:x.b.id,heat:1,since:absDay()-10}];
    for(let k=0;k<100&&!WORLD.offers.length;k++)aiOffersToUser();
    assert.equal(WORLD.offers.length,1);x.o=WORLD.offers[0];assert.equal(x.o.day,x.end);assert.equal(x.o.until,x.end);sold(x);
  });
  test(label+' 推销当天回复的新报价立即可成交',()=>{
    const x=reset(winter);x.b=WORLD.clubs.find(c=>c.id!==x.u.id&&c.squad.length<27&&pitchNeed(c,x.p)>=1);
    assert(x.b);x.b.finance.balance=1e12;x.b.finance.cap0=1e12;WORLD.offers=[];
    WORLD.pitches=[{pid:x.p.id,club:x.b.id,price:100000,day:x.end-1,due:x.end}];pitchReplies();
    assert.equal(WORLD.offers.length,1);x.o=WORLD.offers[0];assert(x.o.pitched);assert.equal(x.o.day,x.end);assert.equal(x.o.until,x.end);sold(x);
  });
  test(label+' 当天生成的新租借报价立即可成交',()=>{
    const x=reset(winter);WORLD.offers=[];assert(makeLoanOffer(x.b,x.p));
    assert.equal(WORLD.offers[0].day,x.end);assert.equal(WORLD.offers[0].until,x.end);
    assert.equal(acceptOffer(0),true,messages.join(';'));assert.equal(x.p.loan.owner,x.u.id);assert.equal(x.p.clubId,x.b.id);
  });
  test(label+' 还价成功后仍可在当天成交',()=>{const x=reset(winter);form({'#co-fee':1.2e6});submitCounter(0);assert.equal(x.o.fee,1.2e6);assert.equal(x.o.until,x.end);sold(x);});
  test(label+' 最终报价当天可成交',()=>{const x=reset(winter);x.o.final=true;x.o.countered=true;sold(x);});
  test(label+' 同一球员多个推销报价可择优成交并清空竞价',()=>{const x=reset(winter);x.o.pitched=true;WORLD.offers.push({...x.o,fee:9e5});sold(x);});
  test(label+' 租借报价当天可成交',()=>{
    const x=reset(winter);Object.assign(x.o,{type:'loan',wageShare:1,minApps:0,half:false});
    assert.equal(acceptOffer(0),true,messages.join(';'));assert.equal(x.p.clubId,x.b.id);assert.equal(x.p.loan.owner,x.u.id);assert(!WORLD.offers.some(o=>o.pid===x.p.id));
  });
  test(label+' 修改租借条款后当天仍可成交',()=>{
    const x=reset(winter);Object.assign(x.o,{type:'loan',wageShare:1,minApps:0,half:false});
    form({'#lc-share':1,'#lc-half':0,'#lc-min':0,'#lc-fee':1e6});submitLoanCounter(0);
    assert(x.o.countered);assert.equal(x.o.until,x.end);assert(WORLD.offers.includes(x.o),messages.join(';'));assert.equal(acceptOffer(0),true);
  });
  test(label+' 到价自动成交在到期日仍执行',()=>{
    const x=reset(winter);x.p.autoSell=true;x.o.atAsk=true;x.o.fee=sellPrice(x.p);const before=x.u.finance.balance;
    autoSellRound();assert.equal(x.p.clubId,x.b.id);assert.equal(x.u.finance.balance-before,x.o.fee);
  });
  test(label+' 关闭窗口后拒绝成交、还价和租借改价',()=>{
    const x=reset(winter);WORLD.day++;const before=JSON.stringify(WORLD);
    assert.equal(acceptOffer(0),false);for(const fn of [counterOffer,submitCounter,loanCounterDialog,submitLoanCounter])fn(0);
    assert.equal(JSON.stringify(WORLD),before);assert.equal(opened.length,0);assert(messages.every(x=>x==='转会窗已关闭'));
  });
  test(label+' 旧档报价不改字段即可恢复并成交',()=>{
    const x=reset(winter),candidate=JSON.parse(JSON.stringify(WORLD)),offers=JSON.stringify(candidate.offers);
    if(typeof assertLoadable==='function')assertLoadable(candidate);adoptWorld(candidate);assert.equal(JSON.stringify(WORLD.offers),offers);
    assert.equal(acceptOffer(0),true);assert.equal(P(x.p.id).clubId,x.b.id);
  });
  for(const match of [false,true])test(label+(match?' 赛后推进':' 无比赛推进')+'至最后一天后可处理报价',()=>{
    const x=reset(winter);WORLD.day=x.end-1;
    // 只安排指定路径；模拟和每日市场处理继续调用真实引擎。
    WORLD.fixtures=WORLD.fixtures.filter(f=>f.day>WORLD.day);const future=WORLD.fixtures.some(f=>!f.played&&f.day>WORLD.day);assert(future);
    if(match){
      const fx={day:WORLD.day,home:x.u.id,away:x.b.id,comp:'L',round:1,played:false,hg:0,ag:0};WORLD.fixtures.push(fx);
      assert.equal(advance().t,'match');CURMATCH=runMatch(createMatch(fx.home,fx.away,{record:false,comp:'L',round:1}));
      assert.equal(finishUserMatch(),'ok');assert(fx.played);
    }else assert.equal(advance().t,'day');
    assert.equal(WORLD.day,x.end);assert(WORLD.offers.includes(x.o));assert.equal(offerDateError(x.o),'');
    const i=WORLD.offers.indexOf(x.o);assert.equal(acceptOffer(i),true,messages.join(';'));
  });
  test(label+' 截止日结束后清空报价',()=>{
    const x=reset(winter);WORLD.fixtures=WORLD.fixtures.filter(f=>f.day>WORLD.day);prepareDeadlineMarket();assert.equal(advance().t,'day');
    assert.equal(WORLD.day,x.end+1);assert.equal(inTransferWindow(),false);assert.equal(WORLD.offers.length,0);
  });
}
test('普通报价在到期日前/当天可处理，次日所有入口拒绝且不能复活',()=>{
  const x=reset();WORLD.day=10;x.o.day=1;x.o.until=10;assert.equal(offerDateError(x.o),'');WORLD.day=9;assert.equal(offerDateError(x.o),'');WORLD.day=11;
  const before=JSON.stringify(WORLD);assert.equal(acceptOffer(0),false);for(const fn of [counterOffer,submitCounter,loanCounterDialog,submitLoanCounter])fn(0);
  assert.equal(JSON.stringify(WORLD),before);assert.equal(opened.length,0);assert(messages.every(x=>x==='报价已过期'));
});
test('无until旧报价兼容day+7，到期当天成交，次日拒绝',()=>{
  let x=reset();WORLD.day=10;x.o.day=3;delete x.o.until;sold(x);
  x=reset();WORLD.day=11;x.o.day=3;delete x.o.until;assert.equal(acceptOffer(0),false);assert.equal(messages.at(-1),'报价已过期');
});
test('过期高价不能挡住仍有效的较低自动成交报价',()=>{
  const x=reset();WORLD.day=10;x.p.autoSell=true;x.o.atAsk=true;x.o.fee=sellPrice(x.p);x.o.day=8;x.o.until=9;
  const valid={...x.o,fee:x.o.fee+1,until:10};x.o.fee*=2;WORLD.offers.push(valid);autoSellRound();
  assert.equal(x.p.clubId,x.b.id);assert.equal(WORLD.transferLog[0].fee,valid.fee);
});
test('普通到期报价在日末清理，未来到期报价仍保留',()=>{
  const x=reset();WORLD.day=10;x.o.day=3;x.o.until=10;const future={...x.o,until:11};WORLD.offers.push(future);
  // 隔离市场随机行为，验证日末清理的时间边界。
  for(const name of ['marketDaily','dailyTick','weeklyTick','faSigningRound'])global[name]=()=>{};
  processDayEnd(10);assert.deepEqual(WORLD.offers,[future]);
});
clearTimeout(SAVE_TIMER);
const report={file:process.env.FMFILE||path.resolve(__dirname,'../../index.html'),sha256:crypto.createHash('sha256').update(fs.readFileSync(process.env.FMFILE||path.resolve(__dirname,'../../index.html'))).digest('hex'),checks:results.length,passed:true,results};
fs.writeFileSync(path.resolve(__dirname,'../../output/deadline/offer-expiry.json'),JSON.stringify(report,null,2));console.log('ALL PASS',results.length);
