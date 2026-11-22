'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const raw=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
const js=raw.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
 HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(js+'\nglobalThis.test={solarBlend,wasteDateInfo,wasteEntries,getInputs,assetName};',ctx);
const {solarBlend,wasteDateInfo,wasteEntries,getInputs,assetName}=ctx.test;
const night=solarBlend(-22),sunrise=solarBlend(-6),morning=solarBlend(5),noon=solarBlend(25);
assert.equal(night.twilight,0);assert.equal(night.daylight,0);
assert(sunrise.twilight>0&&sunrise.twilight<1,'Dawn gradually fades night');
assert.equal(sunrise.daylight,0);
assert(morning.daylight>0&&morning.daylight<1,'Sunrise to daylight gradually fades twilight');
assert.equal(noon.daylight,1);
for(let el=-23,prevTwilight=0,prevDay=0;el<=26;el+=.5){
 const a=solarBlend(el);
 assert(a.twilight>=prevTwilight-1e-9,'Twilight must rise smoothly');
 assert(a.daylight>=prevDay-1e-9,'Daylight must rise smoothly');
 assert(a.twilight>=0&&a.twilight<=1&&a.daylight>=0&&a.daylight<=1);
 prevTwilight=a.twilight;prevDay=a.daylight;
}
assert.equal(solarBlend(20,'night').daylight,0,'Manual night preview works');
assert.equal(solarBlend(-20,'day').daylight,1,'Manual day preview works');
const p={year:2026,month:11,day:22,hour:14};
const hass={config:{time_zone:'Europe/Bratislava'},states:{
 'sensor.najblizsi_komunalny_odpad':{state:'2026-11-24',attributes:{}},
 'sensor.najblizsi_triedeny_zber':{state:'2026-11-27',attributes:{}},
 'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'5',attributes:{unit_of_measurement:'°C'}},
 'weather.home':{state:'partlycloudy',attributes:{temperature:5}},
 'sun.sun':{state:'above_horizon',attributes:{elevation:13,azimuth:180}}
}};
let entries=wasteEntries(hass,{source:'auto'},p);
assert.equal(entries.length,2);
assert.equal(entries[0].kind,'municipal');
assert.equal(entries[0].days,2);
assert.equal(entries[1].kind,'recycling');
assert.equal(entries[1].days,5);
assert.equal(wasteEntries(hass,{show_waste:false},p).length,0);
delete hass.states['sensor.najblizsi_triedeny_zber'];
assert.equal(wasteEntries(hass,{},p).length,1,'Recycling is optional');
hass.states['sensor.najblizsi_komunalny_odpad'].state='unavailable';
assert.equal(wasteEntries(hass,{},p).length,0,'Invalid data never show a waste bar');
hass.states['sensor.najblizsi_komunalny_odpad'].state='2026-11-23';
entries=wasteEntries(hass,{},p);
assert.equal(entries[0].short,'ZAJTRA');
assert.equal(wasteDateInfo('2026-11-22',p).short,'DNES');
assert.equal(wasteDateInfo('2026-11-21',p),null,'Past pickups stay hidden');
assert.equal(wasteDateInfo('2026-02-31',p),null,'Invalid date stays hidden');
hass.states['sensor.najblizsi_komunalny_odpad'].state='—';
assert.equal(wasteEntries(hass,{},p).length,0,'No false collection reminder');
const now=new Date('2026-11-22T12:00:00Z');
const clear=getInputs(hass,{source:'auto',scene:'autumn'},now);
assert(assetName(clear).includes('autumn-full-v81'),'Original V1.1 photo mapping stays unchanged');
assert(clear.blend.daylight===1);
hass.states['sun.sun'].attributes.elevation=-7;
const dusk=getInputs(hass,{source:'auto',scene:'autumn'},now);
assert(dusk.blend.twilight>0&&dusk.blend.daylight===0);
assert(raw.includes('photo photo-day')&&raw.includes('photo photo-twilight')&&raw.includes('photo photo-night'));
assert(raw.includes('bar.style.display=waste.length'));
const html=fs.readFileSync(__dirname+'/dist/TEST.html','utf8');
assert(html.includes('id="playTransition"'),'Interactive original-picture transition test');
assert(html.includes('id="municipal"'),'Test allows waste input');
console.log('PASS CLASSIC: 3 original photo layers + gradual day/night, two optional waste sensors, invalid dates, original scene');
