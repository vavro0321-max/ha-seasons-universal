'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const raw=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
const code=raw.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
  HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(code+'\nglobalThis.reality={getInputs,deepSnowLandscape,weatherId};',ctx);
const {getInputs,deepSnowLandscape}=ctx.reality;
const now=new Date('2026-11-22T11:00:00Z');
const recent='2026-11-22T10:58:00Z',old='2026-11-22T05:00:00Z';
const states={
 'weather.home':{state:'cloudy',attributes:{temperature:6,temperature_unit:'°C',wind_speed:15,wind_speed_unit:'km/h',humidity:75},last_updated:recent},
 'sun.sun':{state:'above_horizon',attributes:{elevation:25,azimuth:185,rising:false}},
 'sensor.ws2900_v2_02_01_solar_radiation':{state:'320',attributes:{unit_of_measurement:'W/m²'},last_updated:recent},
 'sensor.ws2900_v2_02_01_rain_rate':{state:'0',attributes:{unit_of_measurement:'mm/h'},last_updated:recent},
 'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'3',attributes:{unit_of_measurement:'°C'},last_updated:recent}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}};
const d=(overrides={})=>getInputs(hass,{source:'auto',scene:'winter',entities:{weather:'weather.home'},...overrides},now);
let current=d();
assert.equal(current.clouds,'partly','Local sunshine beats regional cloudy conditions');
assert.equal(current.weatherDisplay,'partlycloudy');
assert.equal(current.temperature,3,'Fresh WS2900 temperature beats online');
assert.equal(current.cloudSource,'ws2900_sunshine');
assert.equal(current.snowingNow,false,'Winter is not falling snow');
assert(deepSnowLandscape(current,{}),'Winter seasonal photo may show snow without snowfall');

// HA sensor/forecast state updates must be reflected in a new getInputs() call.
states['sensor.ws2900_v2_02_01_rain_rate'].state='2';
states['weather.home'].state='sunny';
current=d();
assert.equal(current.precipitation,'rain','Measured rain is visible despite sunny forecast');
assert.equal(current.weatherDisplay,'rainy','Condition label must match rain animation');
assert.equal(current.cloudSource,'ws2900_rain');
assert.equal(current.clouds,'overcast');
states['sensor.ws2900_v2_02_01_rain_rate'].state='0';
states['weather.home'].state='rainy';
current=d();
assert.equal(current.precipitation,'none','Dry local sensor cannot force rain animation');
assert.equal(current.weatherDisplay,'partlycloudy','Sunny locality with dry sensor may disagree with regional rain');
states['sensor.ws2900_v2_02_01_solar_radiation'].state='0';
current=d();
assert.equal(current.weatherDisplay,'cloudy','Online rainy without local rain or sunshine is shown as cloudy');
states['weather.home'].state='snowy';
states['sensor.ws2900_v2_02_01_outdoor_temperature'].state='-3';
current=d();
assert.equal(current.snowingNow,true,'Current snowy weather below 2C displays flakes');
assert.equal(current.weatherDisplay,'snowy');
states['sensor.ws2900_v2_02_01_outdoor_temperature'].state='5';
current=d();
assert.equal(current.snowingNow,false,'Warm current air does not display falling snow');
assert.equal(current.weatherDisplay,'cloudy','Avoid snow label when snow animation is suppressed by warmth');

// Stale online metadata must not leak into displayed temperature/humidity/wind.
states['sensor.ws2900_v2_02_01_outdoor_temperature'].state='unavailable';
states['weather.home'].state='cloudy';
states['weather.home'].last_updated=old;
states['sensor.ws2900_v2_02_01_solar_radiation'].state='unavailable';
current=d();
assert.equal(current.weather,'unavailable');
assert.equal(current.temperature,null,'Stale forecast temperature is not real sensor data');
assert.equal(current.humidity,null,'Stale forecast humidity is not real sensor data');
assert.equal(current.wind,0,'Stale forecast wind must not leak into the display');
assert.equal(current.clouds,'partly','Unknown online weather does not mean clear skies');
assert.equal(current.weatherDisplay,'unavailable','When both sources fail show no weather, not sunny');
states['sensor.ws2900_v2_02_01_solar_radiation'].state='530';
current=d();
assert.equal(current.cloudSource,'ws2900_fallback','Fresh strong WS2900 sunlight replaces stale forecast');
assert.equal(current.weatherDisplay,'sunny');
states['sensor.ws2900_v2_02_01_solar_radiation'].last_updated=old;
current=d();
assert.equal(current.weatherDisplay,'unavailable','Stale WS2900 solar reading is not a fresh sunny report');
assert(raw.includes("this._select('snow_landscape','Sneh na zemi')"),
  'Winter visual preset remains configurable');
assert(raw.includes("['auto','Automaticky v zime']"),
  'Winter photo description accurately describes seasonal behavior');
console.log('PASS: live WS2900-online changes, inconsistent rain, snowy weather, stale telemetry, and winter photo independent of flakes');
