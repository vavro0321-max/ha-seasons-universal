const fs=require('fs'),vm=require('vm'),assert=require('assert');
let code=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
  .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const context={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(context);
vm.runInContext(code+'\nglobalThis.test={getInputs,unifiedAssetName};',context);
const {getInputs,unifiedAssetName}=context.test;
const states={
 'sun.sun':{state:'above_horizon',attributes:{elevation:22,azimuth:175,rising:false}},
 'weather.home':{state:'sunny',attributes:{temperature:2}},
 'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'2',attributes:{unit_of_measurement:'°C'}},
 'sensor.ws2900_v2_02_01_humidity':{state:'70',attributes:{unit_of_measurement:'%'}},
 'sensor.ws2900_v2_02_01_dewpoint':{state:'-3',attributes:{unit_of_measurement:'°C'}},
 'sensor.ws2900_v2_02_01_wind_speed':{state:'3',attributes:{unit_of_measurement:'km/h'}}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}}, config={scene:'auto',source:'auto'};
const date=(s)=>new Date(s);
const summer=getInputs(hass,config,date('2026-07-08T12:00:00Z'));
assert.equal(summer.scene,'summer');
assert.equal(summer.leafless,false);
assert.equal(unifiedAssetName(summer),'universal-landscape.webp');
const lateAutumn=getInputs(hass,config,date('2026-11-21T12:00:00Z'));
assert.equal(lateAutumn.scene,'autumn');
assert.equal(lateAutumn.leafless,true,'Bare tree expected on 21 November');
assert.equal(unifiedAssetName(lateAutumn),'universal-landscape-leafless.webp');
const earlyAutumn=getInputs(hass,config,date('2026-09-15T12:00:00Z'));
assert.equal(earlyAutumn.leafless,false);
const winter=getInputs(hass,config,date('2027-01-08T12:00:00Z'));
assert.equal(winter.leafless,true);
assert.equal(unifiedAssetName(winter),'universal-landscape-leafless.webp');
const spring=getInputs(hass,config,date('2027-04-11T12:00:00Z'));
assert.equal(spring.leafless,false);
assert.equal(unifiedAssetName(spring),'universal-landscape.webp');
assert.equal(summer.fogLevel,0);
states['weather.home'].state='fog';
let fog=getInputs(hass,config,date('2026-11-21T12:00:00Z'));
assert(fog.fogLevel>=.8,'Weather fog must show strong fog');
assert.equal(getInputs(hass,{...config,fog_effect:false},date('2026-11-21T12:00:00Z')).fogLevel,0);
states['weather.home'].state='cloudy';
states['sensor.ws2900_v2_02_01_humidity'].state='98';
states['sensor.ws2900_v2_02_01_dewpoint'].state='1.5';
fog=getInputs(hass,config,date('2026-11-21T12:00:00Z'));
assert(fog.fogLevel>.3,'Very humid, calm and near-dewpoint conditions should allow light fog');
states['sensor.ws2900_v2_02_01_wind_speed'].state='22';
assert.equal(getInputs(hass,config,date('2026-11-21T12:00:00Z')).fogLevel,0,'Strong wind must prevent estimated fog');
states['weather.home'].state='snowy';
states['sensor.ws2900_v2_02_01_outdoor_temperature'].state='-3';
const snow=getInputs(hass,config,date('2027-01-15T12:00:00Z'));
assert(snow.snowCover>0&&snow.precipitation==='snow');
states['weather.home'].state='sunny';
assert.equal(getInputs(hass,config,date('2027-01-15T12:00:00Z')).precipitation,'none');
// Regression: winter does not automatically mean snow when it is warm and dry.
states['sensor.ws2900_v2_02_01_outdoor_temperature'].state='9';
states['weather.home'].state='sunny';
const warmWinter=getInputs(hass,config,date('2027-01-15T12:00:00Z'));
assert.equal(warmWinter.scene,'winter');
assert.equal(warmWinter.leafless,true);
assert.equal(warmWinter.snowCover,0,'Warm winter without snow must leave the ground bare');
assert.equal(warmWinter.precipitation,'none');
states['sensor.ws2900_v2_02_01_outdoor_temperature'].state='-4';
const coldButDry=getInputs(hass,config,date('2027-01-15T12:00:00Z'));
assert(coldButDry.snowCover>0,'Cold weather may show decorative frost');
assert.equal(coldButDry.precipitation,'none','Frost must not be presented as active snowfall');
console.log('PASS shared source photograph, leafless late autumn and winter, fog and temperature snow');
