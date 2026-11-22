'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const raw=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
const source=raw.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.test={getInputs,deepSnowLandscape,winterPhotographicAsset};',ctx);
const {getInputs,deepSnowLandscape,winterPhotographicAsset}=ctx.test;
const now=new Date('2026-12-10T12:00:00Z');
const states={
 'sun.sun':{state:'above_horizon',attributes:{elevation:18,azimuth:170}},
 'weather.home':{state:'sunny',attributes:{temperature:-4,temperature_unit:'°C'},last_updated:'2026-12-10T11:55:00Z'},
 'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'-4',attributes:{unit_of_measurement:'°C'},last_updated:'2026-12-10T11:56:00Z'}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}};
const sample=(weather,temp=-4,opts={})=>{
 states['weather.home'].state=weather;
 states['sensor.ws2900_v2_02_01_outdoor_temperature'].state=String(temp);
 return getInputs(hass,{source:'auto',scene:'auto',entities:{weather:'weather.home'},...opts},now);
};
for(const condition of ['sunny','partlycloudy','cloudy','clear-night','fog','rainy']){
 const d=sample(condition);
 assert.equal(d.snowingNow,false,'No snowflakes merely because winter and '+condition);
 assert.notEqual(d.precipitation,'snow','No snowfall for '+condition);
 assert(deepSnowLandscape(d,{}),'The seasonal winter photograph is still snowy: '+condition);
 assert(winterPhotographicAsset(d,{},()=>true)?.startsWith('advent-snow-'),
   'The snowy seasonal photo remains active even without snowfall');
}
let d=sample('snowy');
assert.equal(d.snowingNow,true,'Snowing report at -4 C enables flakes');
assert.equal(d.precipitation,'snow');
d=sample('snowy-rainy');
assert.equal(d.snowingNow,true,'Reported wintry mix can contain snow');
d=sample('snowy',5);
assert.equal(d.snowingNow,false,'Warm outside temperature prevents false snowflakes');
d=sample('cloudy',-10,{snow_landscape:'snow'});
assert.equal(d.snowingNow,false,'Manual snowy landscape does not cause falling snow');
assert(deepSnowLandscape(d,{snow_landscape:'snow'}));
assert.equal(deepSnowLandscape(d,{snow_landscape:'bare'}),false,
  'Bare winter photo remains an explicit opt-out');
d=sample('snowy',-4,{scene:'summer'});
assert.equal(d.snowingNow,true,'Actual snowing not suppressed by manual summer scene');
assert.equal(deepSnowLandscape(d,{}),false,'Manual summer scene is not winter land');
states['weather.home'].last_updated='2026-12-10T07:00:00Z';
d=sample('snowy',-4);
assert.equal(d.snowingNow,false,'Stale online current weather must not produce snowfall');
assert(raw.includes("d.precipitation==='rain'||d.snowingNow===true"),
  'Canvas animates flakes ONLY for live snow report, not snowy photo or frost');
console.log('PASS: winter snowy landscape independent of snow animation; live current-weather snow only, temperature and freshness guards');
