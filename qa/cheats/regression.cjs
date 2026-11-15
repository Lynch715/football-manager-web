const assert=require("node:assert/strict");
require("../deadline/shim.cjs");

const layers=[new Map(),new Map(),new Map()];
let denyWrite=()=>false, denyDelete=()=>false, delayBackup=null, message="";
async function write(layer,key,value){
  if(denyWrite(layer,key))throw new Error("测试写入失败");
  if(delayBackup&&key.startsWith(CHEAT_BACKUP_PREFIX))await delayBackup();
  layers[layer].set(key,value);
}
function remove(layer,key){
  if(denyDelete(layer,key))throw new Error("测试删除失败");
  layers[layer].delete(key);
}
global.idbSet=(key,value)=>write(0,key,value);
global.idbGet=async key=>layers[0].get(key);
global.idbKeys=async()=>[...layers[0].keys()];
global.idbDel=async key=>remove(0,key);
global.cacheOK=()=>true;
global.cacheSet=(key,value)=>write(1,key,value);
global.cacheGet=async key=>layers[1].get(key);
global.cacheSaveKeys=async()=>[...layers[1].keys()];
global.cacheDel=async key=>remove(1,key);
global.localStorage={
  get length(){return layers[2].size;},
  key:i=>[...layers[2].keys()][i],
  getItem:key=>layers[2].get(key),
  setItem:(key,value)=>{
    if(denyWrite(2,key))throw new Error("测试写入失败");
    layers[2].set(key,value);
  },
  removeItem:key=>remove(2,key)
};
global.within=async task=>({v:await task.catch(()=>null)});
global.toast=text=>{message=text;};
global.closeModal=()=>{};
const fields={};
document.querySelector=key=>fields[key];
const field=(id,value)=>{fields["#"+id]={valueAsNumber:value};};
const save=()=>storeSave(JSON.stringify(WORLD),{club:UC().cn,season:WORLD.season,day:WORLD.day});
const body=()=>JSON.stringify({...WORLD,cheats:undefined});
let checks=0;
function pass(label){checks++;console.log("PASS",label);}

async function run(){
  newWorld(20261115,"Coventry City");
  const legacy=JSON.stringify(WORLD);
  layers[2].set(SAVEKEY,legacy);
  assert.equal(await readSave(),legacy);
  adoptWorld(JSON.parse(await readSave()));
  assert.equal(JSON.stringify(WORLD),legacy);
  assert(!Object.hasOwn(WORLD,"cheats"));
  pass("旧存档直接读取且不会开启作弊台或增加字段");

  setCheatsEnabled(true);
  assert(await applyCheat(()=>addMoney(UC(),10000000,"测试注资"),"注资成功"));
  const backupId=WORLD.cheats.backup, key=cheatBackupKey(backupId);
  const oldKey=cheatBackupKey(backupId,LEGACY_CHEAT_BACKUP_PREFIX);
  const backup=layers[2].get(key);
  const oldBytes=JSON.stringify((await findCheatBackup(backupId)).world);
  WORLD.day++;
  await save();
  const current=WORLD, envelopes=layers.map(layer=>layer.get(SAVEKEY));
  denyWrite=(_layer,k)=>k===SAVEKEY;
  assert.equal(await restoreCheatBackup(),false);
  assert.equal(WORLD,current);
  assert.deepEqual(layers.map(layer=>layer.get(SAVEKEY)),envelopes);
  assert.equal(JSON.parse(await readSave()).day,1);
  pass("三层正文均写入失败时，恢复报错且重载保留原进度");

  denyWrite=(layer,k)=>k===METAKEY||layer!==2&&k===SAVEKEY;
  assert(await restoreCheatBackup());
  assert.equal(body(),oldBytes);
  assert.equal(JSON.parse(await readSave()).day,0);
  assert(!cheatsEnabled());
  pass("仅一层正文落盘且三层索引均失败时，恢复如实成功");

  denyWrite=()=>false;
  for(const layer of layers){
    layer.set(oldKey,backup);
    layer.delete(key);
  }
  assert(await findCheatBackup(backupId));
  const invalid=JSON.parse(oldBytes);
  invalid.clubs[0].squad=null;
  const packed=await zipSave(JSON.stringify({...await findCheatBackup(backupId),world:invalid}));
  layers.forEach(layer=>layer.set(key,hashStr(packed)+"\n"+packed));
  layers.forEach(layer=>layer.delete(oldKey));
  const beforeInvalid=await readSave();
  assert.equal(await restoreCheatBackup(),false);
  assert.equal(await readSave(),beforeInvalid);
  assert.equal(WORLD.clubs[0].squad.length,JSON.parse(oldBytes).clubs[0].squad.length);
  pass("旧版备份可读取，无法完成迁移的备份在落盘前被拒绝");

  const otherKey=LEGACY_CHEAT_BACKUP_PREFIX+"touchline-backup";
  const otherCopy=JSON.stringify({payload:"模拟另一款游戏的备份",runtime:{rng:1,pid:2,clk:3}});
  const orphan=cheatBackupKey("orphan-1");
  const unscopedOrphan=LEGACY_CHEAT_BACKUP_PREFIX+"orphan-2";
  layers.forEach((layer,index)=>{
    layer.set(oldKey,backup);
    layer.set(orphan,"损坏的当前备份");
    layer.set(unscopedOrphan,backup);
    if(index!==1)layer.set(otherKey,otherCopy);
    layer.set("fm_fold_v1","界面设置");
  });
  denyDelete=(layer,k)=>layer===0&&k===oldKey;
  assert.deepEqual(await deleteSave(),["IndexedDB"]);
  assert(layers[0].has(oldKey));
  denyDelete=()=>false;
  assert.deepEqual(await deleteSave(),[]);
  assert.equal(await readSave(),null);
  assert.equal(await findCheatBackup(backupId),null);
  for(const [index,layer] of layers.entries()){
    assert.deepEqual([...layer.keys()].sort(),index===1?["fm_fold_v1"]:["fm_fold_v1",otherKey].sort());
  }
  pass("删除清理三层的主档、新旧备份和孤立备份，保留同域另一游戏的备份");

  adoptWorld(JSON.parse(beforeInvalid));
  assert(WORLD.cheats.backup);
  assert.equal(await findCheatBackup(WORLD.cheats.backup),null);
  assert.equal(await restoreCheatBackup(),false);
  pass("导入含历史备份编号的文件时，识别当前浏览器无可用备份");

  newWorld(20261115,"Coventry City");
  setCheatsEnabled(true);
  const young=UC().squad.map(P).find(p=>p.age<=23&&p.pos==="ST");
  field("cheat-ca",100);
  field("cheat-pa",100);
  field("cheat-contract",Math.max(0,young.contract-WORLD.season));
  assert(await submitCheatPlayer(young.id));
  assert.equal(young.ca,200);
  const previousNews=WORLD.inbox[0];
  for(let seed=1;seed<=100&&WORLD.inbox[0]===previousNews;seed++){
    seedRng(seed);
    injuryHitsPotential(young,100);
  }
  assert(young.pa>=young.ca&&young.pa<=200);
  assert.match(WORLD.inbox[0].body,/潜力评估维持在 100/);
  young.pa=202;
  field("cheat-ca",ovr(young));
  field("cheat-contract",6);
  assert(await submitCheatPlayer(young.id));
  assert(young.pa===200&&young.contract===WORLD.season+6);
  pass("重伤无法提高潜力，含异常潜力的旧球员可以更新合同并修正潜力");

  newWorld(20261115,"Coventry City");
  setCheatsEnabled(true);
  let release, started;
  const waiting=new Promise(resolve=>{release=resolve;});
  const writing=new Promise(resolve=>{started=resolve;});
  delayBackup=()=>{started();return waiting;};
  const apply=applyCheat(()=>assert.fail("删档后不能再修改世界"),"测试改动");
  await writing;
  const deleting=deleteSave();
  release();
  assert.deepEqual(await deleting,[]);
  assert.equal(await apply,false,message);
  assert(layers.every(layer=>[...layer.keys()].every(k=>!k.startsWith(CHEAT_BACKUP_PREFIX))));
  pass("删档等待在途备份完成，清理后不会重新生成副本");
  console.log(JSON.stringify({passed:true,checks}));
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(SAVE_TIMER));
