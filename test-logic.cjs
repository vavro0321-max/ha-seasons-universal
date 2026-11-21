const fs=require('fs'),vm=require('vm'),assert=require('assert');
let code=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
code=code.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const context={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(context);
vm.runInContext(code+'\nglobalThis.helpers={getInputs,assetName,seasonAt,moonPhase};',context);
const {getInputs,assetName,seasonAt,moonPhase}=context.helpers;
const states={
'weather.home':{state:'sunny',attributes:{temperature:8,temperature_unit:'°C',wind_speed:9,wind_speed_unit:'km/h'}},
'sun.sun':{state:'above_horizon',attributes:{elevation:30,azimuth:155}},
'sensor.ws2900_v2_02_01_rain_rate':{state:'0',attributes:{unit_of_measurement:'mm/h'}},
'sensor.ws2900_v2_02_01_solar_radiation':{state:'850',attributes:{unit_of_measurement:'W/m²'}},
'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'5',attributes:{unit_of_measurement:'°C'}}};
const hass={states,config:{time_zone:'Europe/Bratislava'}};
const now=new Date('2026-10-10T10:00:00Z');
let d=getInputs(hass,{source:'auto'},now);assert.equal(d.clouds,'clear');assert.equal(d.temperature,5);
const bright=d.brightness;
states['sensor.ws2900_v2_02_01_solar_radiation'].state='20';d=getInputs(hass,{source:'auto'},now);assert(d.brightness<bright,'Solar must change brightness');
states['weather.home'].state='partlycloudy';d=getInputs(hass,{source:'auto'},now);assert.equal(d.clouds,'partly');assert(assetName(d).includes('partly'));
states['weather.home'].state='cloudy';d=getInputs(hass,{source:'auto'},now);assert.equal(d.clouds,'overcast');assert(assetName(d).includes('overcast'));
states['weather.home'].state='rainy';states['sensor.ws2900_v2_02_01_rain_rate'].state='0.2';const light=getInputs(hass,{source:'auto'},now);assert.equal(light.precipitation,'rain');states['sensor.ws2900_v2_02_01_rain_rate'].state='18';const heavy=getInputs(hass,{source:'auto'},now);assert(heavy.intensity>light.intensity,'Rain strength must rise');
const online=getInputs(hass,{source:'online'},now);assert.equal(online.temperature,8);assert.equal(online.estimated,true);assert.equal(online.precipitation,'rain');
states['weather.home'].state='snowy';states['weather.home'].attributes.temperature=-3;d=getInputs(hass,{source:'online'},now);assert.equal(d.precipitation,'snow');
assert.equal(seasonAt({year:2026,month:12,day:31}),'newyear');assert.equal(seasonAt({year:2027,month:1,day:6}),'christmas');assert.equal(seasonAt({year:2027,month:1,day:7}),'winter');
const easter2027=seasonAt({year:2027,month:3,day:28});assert.equal(easter2027,'easter');
assert.equal(moonPhase({states:{'sensor.moon_faza':{state:'spln'}}},null,now).index,4);
console.log('PASS 17 logical assertions / test groups');
