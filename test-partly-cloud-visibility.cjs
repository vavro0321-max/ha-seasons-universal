'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const raw=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
const js=raw.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
 HTMLElement:class{},console,Date,Intl,URL,Math,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(js+'\nglobalThis.skyTest={getInputs,cloudVisualProfile};',ctx);
const {getInputs,cloudVisualProfile}=ctx.skyTest;
const p=cloudVisualProfile('partly',1),o=cloudVisualProfile('overcast',1),
 clear=cloudVisualProfile('clear',1),night=cloudVisualProfile('partly',0);
assert(p.bankOpacity<=.025,'Partly cloudy must have just a few thin wisps');
assert(p.bankOpacity*8<o.bankOpacity,'Much fewer clouds than overcast');
assert(p.blueOpening>.50,'Partly sky needs a substantial blue opening');
assert.equal(o.blueOpening,0,'Overcast sky must not get artificial blue opening');
assert.equal(clear.bankOpacity,0,'Clear sky has no generated clouds');
assert.equal(night.blueOpening,0,'No daylight sky opening at night');
assert(p.nightCloudShade<o.nightCloudShade/5,'Partly night is much clearer');
assert(p.sunshine>o.sunshine*5,'Partly should have visibly more sunlight');
assert(raw.includes('el(\'.skybreak\').style.opacity='),
 'Blue opening must be connected to the weather data');
assert(raw.includes('el(\'.cloudbank\').style.opacity=skyProfile.bankOpacity'),
 'Visual cloud count must come from weather');
assert(raw.includes("d.precipitation==='none'?skyProfile.blueOpening:0"),
 'No false blue sky opening when raining or snowing');
const now=new Date('2026-11-22T12:00:00Z');
const states={
 'weather.home':{state:'partlycloudy',attributes:{temperature:4}},
 'sun.sun':{state:'above_horizon',attributes:{elevation:25,azimuth:170}},
};
const hass={states,config:{time_zone:'Europe/Bratislava'}};
const at=x=>{states['weather.home'].state=x;return getInputs(hass,{source:'online'},now);};
const partly=at('partlycloudy'),cloudy=at('cloudy'),sunny=at('sunny');
assert.equal(partly.clouds,'partly');
assert.equal(cloudy.clouds,'overcast');
assert.equal(sunny.clouds,'clear');
assert(partly.brightness>cloudy.brightness,
 'Partly cloudy daylight must be brighter than overcast');
assert(sunny.brightness>=partly.brightness,
 'Partly cloudy must not be brighter than cloudless');
console.log('PASS: distinct mostly-blue partly cloudy sky, sparse generated clouds, dark overcast, no false night/rain blue sky');
