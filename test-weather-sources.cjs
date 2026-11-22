'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
let source=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
source=source.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
 HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.test={getInputs,weatherId,entityAgeMinutes};',ctx);
const now=new Date('2026-11-22T10:00:00Z'),states={
 'weather.home':{state:'cloudy',attributes:{temperature:4},last_updated:'2026-11-22T09:55:00Z'},
 'sun.sun':{state:'above_horizon',attributes:{elevation:21,azimuth:180}},
 'sensor.ws2900_v2_02_01_solar_radiation':{state:'230',attributes:{unit_of_measurement:'W/m²'},last_updated:'2026-11-22T09:57:00Z'},
 'sensor.ws2900_v2_02_01_rain_rate':{state:'0',attributes:{unit_of_measurement:'mm/h'},last_updated:'2026-11-22T09:57:00Z'}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}};
const at=config=>ctx.test.getInputs(hass,{source:'auto',entities:{weather:'weather.home'},...config},now);
let d=at();
assert.equal(d.clouds,'partly','WS2900 sees sunlight while forecast cloudy');
assert.equal(d.weatherDisplay,'partlycloudy','Visible text must say partly cloudy');
assert.equal(d.cloudSource,'ws2900_sunshine');
assert(d.solarRatio>.5);
assert.equal(at({source:'online'}).clouds,'overcast','Online-only setting must be respected');
states['sensor.ws2900_v2_02_01_solar_radiation'].last_updated='2026-11-22T09:10:00Z';
d=at();assert.equal(d.clouds,'overcast','Stale solar reading must NOT override forecast');
states['sensor.ws2900_v2_02_01_solar_radiation'].last_updated='2026-11-22T09:57:00Z';
states['sensor.ws2900_v2_02_01_rain_rate'].state='2.0';
d=at();assert.equal(d.clouds,'overcast','Measured rain beats sunlight');
assert.equal(d.precipitation,'rain');
states['sensor.ws2900_v2_02_01_rain_rate'].state='0';
states['sun.sun'].attributes.elevation=-12;
d=at();assert.equal(d.clouds,'overcast','At night solar cannot infer cloud cover');
states['sun.sun'].attributes.elevation=21;
states['sensor.ws2900_v2_02_01_solar_radiation'].state='0';
states['weather.home'].state='partlycloudy';
d=at();assert.equal(d.clouds,'partly','Zero sunlight does not prove overcast (shade/snow)');
states['weather.home'].state='cloudy';
states['sensor.ws2900_v2_02_01_solar_radiation'].state='230';
states['weather.forecast_cierne_11']={state:'unavailable',attributes:{}};
assert.equal(ctx.test.weatherId(hass,null,now),'weather.home','Use a valid weather entity when preferred one is unavailable');
states['weather.home'].state='unavailable';
d=ctx.test.getInputs(hass,{source:'auto'},now);
assert.equal(d.cloudSource,'ws2900_fallback','Station sunshine replaces unavailable online weather');
assert.equal(d.weatherDisplay,'sunny','Strong sunshine without forecast is clear');
states['weather.home'].state='cloudy';
states['weather.home'].last_updated='2026-11-22T05:00:00Z';
d=ctx.test.getInputs(hass,{source:'auto'},now);
assert.equal(d.cloudSource,'ws2900_fallback','5-hour-old online weather is ignored');
console.log('PASS: online plus WS2900 daylight reconciliation, stale sensor guards, rain, night, fallbacks, and display text');
