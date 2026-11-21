const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
  .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.getInputsForTest=getInputs;',ctx);
const states={
 'sun.sun':{state:'below_horizon',attributes:{elevation:-34,azimuth:170,rising:false}},
 'weather.home':{state:'clear-night',attributes:{temperature:2}},
 'sensor.moon_faza':{state:'full_moon'}
};
const ha={states,config:{time_zone:'Europe/Bratislava'}};
const at=(elevation,weather,moon,config={})=>{
  states['sun.sun'].attributes.elevation=elevation;
  states['sun.sun'].state=elevation>=0?'above_horizon':'below_horizon';
  states['weather.home'].state=weather;states['sensor.moon_faza'].state=moon;
  return ctx.getInputsForTest(ha,{source:'online',scene:'autumn',...config},new Date('2026-11-21T20:00:00Z'));
};
const clear=at(-34,'clear-night','full_moon');
const partly=at(-34,'partlycloudy','full_moon');
const overcast=at(-34,'cloudy','full_moon');
const newMoon=at(-34,'clear-night','new_moon');
assert(clear.brightness>partly.brightness && partly.brightness>overcast.brightness,'Moonlit night must be brighter than cloudy night');
assert(clear.brightness>newMoon.brightness,'Full moon must brighten the night');
assert(overcast.brightness>.35,'Cloudy night must not become nearly black');
assert(clear.brightness<.75,'Even full-moon night must remain darker than daytime');
const dim=at(-34,'clear-night','full_moon',{night_brightness:.8});
const bright=at(-34,'clear-night','full_moon',{night_brightness:1.35});
assert(bright.brightness>clear.brightness && clear.brightness>dim.brightness,'Night exposure slider must work');
const day=at(33,'sunny','full_moon');
const dayDim=at(33,'sunny','full_moon',{night_brightness:.8});
const dayBright=at(33,'sunny','full_moon',{night_brightness:1.35});
assert.equal(day.brightness,dayDim.brightness,'Night exposure must not affect day');
assert.equal(day.brightness,dayBright.brightness,'Night exposure must not affect day');
assert(day.brightness>clear.brightness,'Night must remain dimmer than day');
assert(at(-7,'clear-night','full_moon').brightness>at(-34,'clear-night','full_moon').brightness,'Twilight must fade gradually');
assert(at(-34,'cloudy','full_moon',{night_brightness:1.35}).brightness<day.brightness);
assert(source.includes('data-number="night_brightness"'),'Editor must have a night brightness slider');
assert(source.includes('data-night-text'),'Slider must update its value label');
console.log('PASS V1.6.1 brighter night without daylight changes; moon/cloud differences; editable exposure');
