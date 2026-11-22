'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
  .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
 HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(src+'\nglobalThis.audit={getInputs,pick};',ctx);
const {getInputs,pick}=ctx.audit;
const states={
 'weather.home':{state:'partlycloudy',attributes:{temperature:5}},
 'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'unavailable',attributes:{device_class:'temperature',unit_of_measurement:'°C'}},
 'sensor.backup_outdoor_temperature':{state:'1.5',attributes:{device_class:'temperature',unit_of_measurement:'°C',friendly_name:'Outdoor temp'},last_updated:'2026-11-22T12:00:00Z'},
 'sensor.ws2900_v2_02_01_solar_radiation':{state:'unavailable',attributes:{unit_of_measurement:'W/m²'}},
 'sensor.secondary_solar_radiation':{state:'380',attributes:{unit_of_measurement:'W/m²'},last_updated:'2026-11-22T12:00:00Z'},
 'sensor.ws2900_v2_02_01_rain_rate':{state:'unavailable',attributes:{unit_of_measurement:'mm/h'}},
 'sensor.backup_rain_rate':{state:'0',attributes:{unit_of_measurement:'mm/h'},last_updated:'2026-11-22T12:00:00Z'},
 'sensor.ws2900_v2_02_01_wind_speed':{state:'unavailable'},
 'sensor.backup_wind_speed':{state:'6',attributes:{unit_of_measurement:'km/h'},last_updated:'2026-11-22T12:00:00Z'}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}};
const cfg={source:'auto',scene:'auto',phase:'auto',station_max_age_minutes:25};
let d=getInputs(hass,cfg,new Date('2026-11-22T12:05:00Z'));
assert.equal(d.temperature,1.5,'Usable alternative temperature beats unavailable primary');
assert.equal(d.solar,380,'Usable alternative solar beats unavailable primary');
assert.equal(d.rain,0,'Usable alternative rain sensor beats unavailable primary');
assert.equal(d.wind,6,'Usable alternative wind beats unavailable primary');
assert(d.solarRatio>0.5,'Alternative solar value drives weather reconciliation');
// With an old backup, a fresh third measurement takes precedence.
states['sensor.secondary_solar_radiation'].last_updated='2026-11-22T09:00:00Z';
states['sensor.third_solar_radiation']={state:'420',attributes:{unit_of_measurement:'W/m²'},last_updated:'2026-11-22T12:03:00Z'};
d=getInputs(hass,cfg,new Date('2026-11-22T12:05:00Z'));
assert.equal(d.solar,420,'Stale backup skipped in favor of fresh alternative');
// User-selected explicit sensor must remain authoritative even if unavailable.
d=getInputs(hass,{...cfg,entities:{solar:'sensor.ws2900_v2_02_01_solar_radiation'}},new Date('2026-11-22T12:05:00Z'));
assert.equal(d.solar,null,'Forced unavailable entity does not silently switch sources');
delete hass.states['sensor.ws2900_v2_02_01_outdoor_temperature'];
delete hass.states['sensor.backup_outdoor_temperature'];
const tests=[
 ['2026-11-22T00:00:00Z',1,'night'],
 ['2026-11-22T04:00:00Z',5,'night'],
 ['2026-11-22T06:00:00Z',7,'dawn'],
 ['2026-11-22T12:00:00Z',13,'day'],
 ['2026-11-22T17:00:00Z',18,'dusk'],
 ['2026-11-22T22:00:00Z',23,'night'],
 ['2026-07-22T21:00:00Z',23,'night']
];
for(const [time,localHour,expected] of tests){
 const out=getInputs(hass,cfg,new Date(time));
 assert.equal(out.p.hour,localHour,'Timezone must be Europe/Bratislava: '+time);
 assert.equal(out.phase,expected,'Missing sun.sun phase at '+time);
 assert.equal(out.isNight,expected==='night','Night switch should agree with phase at '+time);
 if(expected==='night')assert(out.nightLight>.99,'Midnight must be dark: '+time);
 else if(expected==='day')assert(out.nightLight<.01,'Midday must have daylight: '+time);
}
const moment=new Date('2026-11-22T12:00:00Z');
hass.states['sun.sun']={state:'below_horizon',attributes:{elevation:'unavailable'}};
assert.equal(getInputs(hass,cfg,moment).phase,'night','sun.sun state remains useful without elevation');
hass.states['sun.sun']={state:'above_horizon',attributes:{elevation:'unavailable'}};
assert.equal(getInputs(hass,cfg,moment).phase,'day','sun.sun above_horizon remains useful without elevation');
hass.states['sun.sun']={state:'unavailable',attributes:{elevation:25}};
assert.equal(getInputs(hass,cfg,new Date('2026-11-22T22:00:00Z')).phase,'night',
 'Stale elevation on unavailable sun.sun must not falsely show daytime');
hass.states['sun.sun']={state:'above_horizon',attributes:{elevation:15},last_updated:'2026-11-22T05:00:00Z'};
assert.equal(getInputs(hass,cfg,new Date('2026-11-22T22:00:00Z')).phase,'night',
 'Old sun.sun elevation must not falsely show daytime');
assert.equal(getInputs(hass,{...cfg,phase:'night'},moment).phase,'night',
 'Manual phase override remains intact');
console.log('PASS: sun.sun loss + timezone and clock fallback; unavailable/stale WS2900 alternatives and forced sensor overrides');
