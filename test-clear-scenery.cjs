'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8').replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(code+'\nglobalThis.getInputsForTest=getInputs;',ctx);
const states={
 'sun.sun':{state:'below_horizon',attributes:{elevation:-25,azimuth:125,rising:false}},
 'weather.home':{state:'clear-night',attributes:{temperature:2.2}},
 'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'2.2',attributes:{unit_of_measurement:'°C'}},
 'sensor.ws2900_v2_02_01_humidity':{state:'98'},
 'sensor.ws2900_v2_02_01_dewpoint':{state:'1.8',attributes:{unit_of_measurement:'°C'}},
 'sensor.ws2900_v2_02_01_wind_speed':{state:'2',attributes:{unit_of_measurement:'km/h'}}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}},date=new Date('2026-11-21T20:00:00Z');
const d=()=>ctx.getInputsForTest(hass,{source:'auto',scene:'auto'},date);
const clear=d();
assert(clear.fogLevel>0,'Saturated humidity can estimate fog');
assert(code.includes("d.fogLevel*(d.weather==='fog'?.83:.22)"),'Estimated haze must be weak on built-in photo');
assert(code.includes("d.fogLevel*(d.weather==='fog'?.58:.14)"),'Estimated haze must be weak on custom photo');
assert(code.includes("d.clouds==='overcast'?.25:d.clouds==='partly'?.07:0"),'Cloud blur opacity reduced');
assert(code.includes("filter:blur(7px)"),'Cloud edges not excessively blurred');
assert(clear.fogLevel*.22 <.18,'Estimated fog must not wash out the landscape');
states['weather.home'].state='fog';
const fog=d();
assert(fog.fogLevel>=.8,'Actual fog should remain strong');
assert(fog.fogLevel*.83 >.6,'Reported fog must remain apparent');
states['weather.home'].state='sunny';
states['sensor.ws2900_v2_02_01_humidity'].state='70';
const sunny=d();assert.equal(sunny.fogLevel,0);
assert(!code.includes('livingPaintActor'),'No moving people or cars');
console.log('PASS clear scenes avoid white haze; fog only strong when weather reports it');
