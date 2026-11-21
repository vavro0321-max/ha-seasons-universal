'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
 .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
 HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(code+'\nglobalThis.getInputsForTest=getInputs;',ctx);
const states={
 'sun.sun':{state:'below_horizon',attributes:{elevation:-25,azimuth:125,rising:false}},
 'weather.home':{state:'clear-night',attributes:{temperature:2.2}},
 'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'2.2',attributes:{unit_of_measurement:'°C'}},
 'sensor.ws2900_v2_02_01_humidity':{state:'99'},
 'sensor.ws2900_v2_02_01_dewpoint':{state:'2.1',attributes:{unit_of_measurement:'°C'}},
 'sensor.ws2900_v2_02_01_wind_speed':{state:'1',attributes:{unit_of_measurement:'km/h'}}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}},now=new Date('2026-11-21T20:00:00Z');
const at=(weather,config={})=>{
 states['weather.home'].state=weather;
 return ctx.getInputsForTest(hass,{source:'auto',scene:'auto',...config},now);
};
for(const [name,cloud] of [['sunny','clear'],['clear-night','clear'],
 ['partlycloudy','partly'],['cloudy','overcast'],['rainy','overcast'],['snowy','overcast']]){
 const d=at(name);
 assert.equal(d.fogLevel,0,name+' must have NO haze even with 99% humidity, zero wind and dewpoint near temperature');
 assert.equal(d.clouds,cloud,name+' must retain its distinct cloud classification');
}
for(const state of ['fog','mist']){
 const d=at(state);
 assert(d.fogLevel>=.8,'Actual '+state+' must show fog');
 assert.equal(d.clouds,'overcast',state+' must be overcast');
 assert.equal(at(state,{fog_effect:false}).fogLevel,0,'Manual fog toggle overrides '+state);
}
assert.equal(at('cloudy',{fog_effect:true}).fogLevel,0,'Manual toggle cannot create fog without the weather state');
assert(code.includes("const reportedFog=wx==='fog'||wx==='mist';"),'Only explicit fog or mist accepted');
assert(code.includes("const fogLevel=config.fog_effect===false?0:(reportedFog?.87:0);"));
assert(!code.includes('fogEstimate'),'Humidity / dewpoint estimation must be removed');
assert(code.includes("unifiedMap.querySelector('.us-fog').style.opacity=d.fogLevel.toFixed(3)"),'Built-in photos get no fog on cloudy days');
assert(code.includes("fog.style.opacity=usingCustom?d.fogLevel.toFixed(3):'0'"),'Personal images get no fog on cloudy days');
assert(code.includes("inset:0 0 72% 0"),'Clouds restricted to upper sky');
assert(code.includes("d.clouds==='overcast'?.34:d.clouds==='partly'?.13:0"),'Three visible cloud intensities');
assert(code.includes("d.clouds==='overcast'?.97:d.clouds==='partly'?1.02:1.07"),'Avoid washed-out low-saturation overcast landscape');
assert(!code.includes('livingPaintActor'),'No moving cars/people');
console.log('PASS: clear/partly/overcast/rain/snow without fog, mist/fog enabled, cloudbank only in sky, personal photos safe');
