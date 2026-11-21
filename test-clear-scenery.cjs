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
// Verify rendered weather behavior first; don't tie this test to an exact source string.
for(const weather of ['fog','mist']){
  assert.equal(at(weather,{fog_effect:false}).fogLevel,0,
    'Fog layer must disappear when disabled, even for '+weather);
  assert.equal(at(weather,{fog_effect:true}).fogLevel,.87,
    'Real '+weather+' must create the intended fog strength');
}
assert.equal(at('sunny',{fog_effect:true}).fogLevel,0,
  'A clear landscape stays haze-free even when fog effects are enabled');
assert.equal(at('cloudy',{fog_effect:true}).fogLevel,0,
  'Clouds are not fog; high humidity must not create a white veil');
assert.equal(at('partlycloudy',{fog_effect:true}).fogLevel,0,
  'Partial cloud cover must not create fog');

// Check that the two visual paths are connected to the measured fog level.
// Regex deliberately tolerates whitespace and formatting changes, unlike
// exact code.includes() comparisons, while still requiring the fog connections.
assert.match(code,/unifiedMap\.querySelector\(['"]\.us-fog['"]\)\.style\.opacity\s*=\s*d\.fogLevel\b/,
  'Built-in panorama must use the computed fog level');
assert.match(code,/fog\.style\.opacity\s*=\s*usingCustom\s*\?\s*d\.fogLevel\b/,
  'Custom-photo fog must use the computed fog level');
assert.match(code,/\.cloudbank\s*\{[^}]*inset\s*:\s*0\s+0\s+72%\s+0/,
  'Cloudbank must remain restricted to the upper sky');
assert(!code.includes('livingPaintActor'),'Moving actors must remain disabled');
console.log('PASS: clear/partly/overcast/rain/snow without fog, mist/fog enabled, cloudbank only in sky, personal photos safe');
