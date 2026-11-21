const fs=require('fs'),vm=require('vm'),assert=require('assert');
let code=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
code=code.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const context={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(context);
vm.runInContext(code+'\nglobalThis.helpers={getInputs,assetName,smoothstep};',context);
const {getInputs,assetName,smoothstep}=context.helpers;
const states={
 'sun.sun':{state:'above_horizon',attributes:{elevation:21,azimuth:180,rising:false}},
 'weather.home':{state:'partlycloudy',attributes:{temperature:2}},
 'sensor.ws2900_v2_02_01_solar_radiation':{state:'0',attributes:{unit_of_measurement:'W/m²'}}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}};
const cfg={source:'auto',phase:'auto',scene:'autumn'};
const now=new Date('2026-11-21T14:24:00Z');
const at=e=>{states['sun.sun'].attributes.elevation=e;states['sun.sun'].state=e>=0?'above_horizon':'below_horizon';return getInputs(hass,cfg,now);};
const noon=at(21),beforeSunset=at(3),sunset=at(0),dusk=at(-6),earlyNight=at(-15),midnight=at(-59);
const beforeDawn=at(-9),sunrise=at(-1),morning=at(9);
assert(noon.brightness>beforeSunset.brightness);
assert(beforeSunset.brightness>sunset.brightness);
assert(sunset.brightness>dusk.brightness);
assert(dusk.brightness>earlyNight.brightness);
assert(earlyNight.brightness>midnight.brightness);
assert(beforeDawn.brightness>midnight.brightness);
assert(sunrise.brightness>beforeDawn.brightness);
assert(morning.brightness>sunrise.brightness);
assert(noon.dayLight>beforeSunset.dayLight);
assert(midnight.nightLight>sunset.nightLight);
assert(beforeSunset.warmth>noon.warmth);
assert(sunrise.warmth>midnight.warmth);
for(const d of [noon,beforeSunset,sunset,dusk,earlyNight,midnight,beforeDawn,sunrise,morning]){
 assert.equal(assetName(d),'autumn-full-v81-partly.webp','No scene jump during the day/night cycle');
 assert(d.brightness>0&&d.brightness<=1.17);
 assert(d.nightLight>=0&&d.nightLight<=1);
}
assert.equal(smoothstep(-10,10,-10),0);
assert.equal(smoothstep(-10,10,10),1);
states['sensor.ws2900_v2_02_01_solar_radiation'].state='1200';
const nightWithSolar=at(-33);
states['sensor.ws2900_v2_02_01_solar_radiation'].state='0';
assert.equal(nightWithSolar.brightness,at(-33).brightness,'Night must not brighten from solar sensor');
assert(getInputs(hass,{...cfg,phase:'night'},now).solarElevation<0);
assert(getInputs(hass,{...cfg,phase:'day'},now).solarElevation>0);
for(const scene of ['christmas','may','easter']){
 const a=getInputs(hass,{...cfg,scene,phase:'day'},now),b=getInputs(hass,{...cfg,scene,phase:'night'},now);
 assert.equal(assetName(a),assetName(b));
}
console.log('PASS continuous sunrise / sunset / night and single-image logic');
