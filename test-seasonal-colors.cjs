const fs=require('fs'),vm=require('vm'),assert=require('assert');
let src=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
src=src.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const context={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(context);
vm.runInContext(src+'\nglobalThis.test={seasonAt,seasonStrength,visualSeason,recolorSeasonalPixels,assetName,getInputs};',context);
const {seasonAt,seasonStrength,visualSeason,recolorSeasonalPixels,assetName,getInputs}=context.test;
const dates=[[2026,4,17,'spring'],[2026,7,17,'summer'],[2026,9,20,'autumn'],[2026,11,21,'autumn'],[2027,2,17,'winter'],[2026,12,24,'christmas']];
for(const [year,month,day,expected] of dates)assert.equal(seasonAt({year,month,day}),expected);
assert(seasonStrength('autumn',{month:11,day:21})>seasonStrength('autumn',{month:9,day:9}));
assert.equal(visualSeason('memorial'),'autumn');
assert.equal(visualSeason('easter'),'spring');
assert.equal(visualSeason('christmas'),'winter');
// Shared source photo must no longer imply shared green leaves in every season.
const vegetation=[82,134,28,255];
const original=vegetation.slice();
const recolored={};
for(const season of ['spring','summer','autumn']){
  const pixel=new Uint8ClampedArray(vegetation);
  recolorSeasonalPixels(pixel,1,1,season,.96);
  recolored[season]=Array.from(pixel).slice(0,3);
}
assert(recolored.autumn[0]>recolored.autumn[1],'Autumn vegetation must become amber/orange');
assert(recolored.summer[1]>recolored.summer[0],'Summer vegetation must stay green');
assert(recolored.spring[1]>recolored.spring[0],'Spring vegetation must look fresh green');
assert.notDeepEqual(recolored.spring,recolored.summer,'Spring and summer must differ');
assert.notDeepEqual(recolored.autumn,recolored.summer,'Autumn and summer must differ');
assert.deepEqual(original,vegetation,'Input pixels unchanged');
for(const rgb of [[40,120,230,255],[224,224,224,255],[156,45,30,255]]){
  const a=new Uint8ClampedArray(rgb);
  recolorSeasonalPixels(a,1,1,'autumn',1);
  assert(a[0]===rgb[0]&&a[1]===rgb[1]&&a[2]===rgb[2],'Sky, snow, roofs must stay stable');
}
const now=new Date('2026-11-21T11:00:00Z');
const hass={config:{time_zone:'Europe/Bratislava'},states:{
 'sun.sun':{state:'above_horizon',attributes:{elevation:10,azimuth:180}},
 'weather.home':{state:'sunny',attributes:{temperature:4}}
}};
const d=getInputs(hass,{source:'auto',scene:'auto'},now);
assert.equal(d.scene,'autumn','Auto mode must select autumn in November');
assert(assetName(d).startsWith('autumn-'),'Autumn scene must use autumn asset');
const forced=getInputs(hass,{source:'auto',scene:'spring'},now);
assert.equal(forced.scene,'spring','Manual season override must still work');
console.log('PASS seasonal calendar, autumn foliage, distinct spring/summer and preserved landscape');
