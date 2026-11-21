const fs=require('fs'),vm=require('vm'),assert=require('assert');
let code=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
code=code.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const sandbox={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(sandbox);
vm.runInContext(code+'\nglobalThis.testGetInputs=getInputs;',sandbox);
const states={
 'sun.sun':{state:'below_horizon',attributes:{elevation:-32,azimuth:120,rising:false}},
 'weather.home':{state:'clear-night',attributes:{temperature:-3}},
 'sensor.ws2900_v2_02_01_outdoor_temperature':{state:'-3',attributes:{unit_of_measurement:'°C'}},
 'sensor.moon_faza':{state:'full_moon',attributes:{}}
};
const hass={states,config:{time_zone:'Europe/Bratislava'}},now=new Date('2026-11-21T19:30:00Z');
const config={source:'station',scene:'autumn',phase:'auto',entities:{weather:'weather.home',temperature:'sensor.ws2900_v2_02_01_outdoor_temperature'}};
const at=(weather,temp,moon='full_moon',options={})=>{
 states['weather.home'].state=weather;
 states['sensor.ws2900_v2_02_01_outdoor_temperature'].state=String(temp);
 states['sensor.moon_faza'].state=moon;
 return sandbox.testGetInputs(hass,{...config,...options},now);
};
const clear=at('clear-night',-3),partly=at('partlycloudy',-3),overcast=at('cloudy',-3),newmoon=at('clear-night',-3,'new_moon');
assert(clear.brightness>partly.brightness && partly.brightness>overcast.brightness);
assert(clear.moonlight>partly.moonlight && partly.moonlight>overcast.moonlight);
assert(clear.brightness>newmoon.brightness);
assert.strictEqual(at('clear-night',-3,'full_moon',{moonlight_effect:false}).moonlight,0);
assert(at('cloudy',-7).brightness>.22);
assert(at('sunny',-7).snowCover>at('sunny',0).snowCover);
assert(at('sunny',0).snowCover>at('sunny',3).snowCover);
assert.strictEqual(at('sunny',3).snowCover,0);
assert.strictEqual(at('sunny',-7).precipitation,'none');
assert.strictEqual(at('snowy',-3).precipitation,'snow');
assert(at('snowy',-3).snowCover>at('sunny',-3).snowCover);
assert.strictEqual(at('cloudy',-3).precipitation,'none');
assert(code.includes('.scene-map')&&code.includes('.frost-cover')&&code.includes('.village-lights'));
console.log('PASS V1.3 cloudy vs moonlit nights, village lights and visual frost logic');
