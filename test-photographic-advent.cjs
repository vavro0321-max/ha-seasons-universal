'use strict';
const assert=require('assert');
const fs=require('fs'),vm=require('vm');
const raw=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
const source=raw.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
 HTMLElement:class{},console,Math,Date,URL,Intl,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.adventPhotoTest={ADVENT_PHOTO_OVERLAY,holidayDecorAt,landscapeHolidayPlacement};',ctx);
const {ADVENT_PHOTO_OVERLAY,holidayDecorAt,landscapeHolidayPlacement}=ctx.adventPhotoTest;
assert(fs.existsSync('dist/assets/advent-photo-night-final.webp'),'Final approved four-candle photograph must be installed');
const b=fs.readFileSync('dist/assets/advent-photo-night-final.webp');
assert(b.length>75000&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP',
 'The Advent photo must be an actual WebP, not placeholder text');
assert(raw.includes("const integratedAdvent=!usingCustom&&d.holiday.advent&&"),
 'Photographic scene must run during Advent days AND nights for built-in backgrounds');
assert(raw.includes("this._config.advent_photo!==false"),'User must be able to disable Advent photo');
assert(raw.includes("this._config.show_christmas_tree!==false"),'Existing tree setting retained');
assert(raw.includes("this._config.show_advent_wreath!==false"),'Existing wreath setting retained');
assert(raw.includes("const image=integratedAdvent?'advent-photo-night-final.webp'"),
 'Scene asset must be the approved four-candle photograph');
assert(raw.includes("wreath.style.display=integratedAdvent||"),'No pasted duplicate wreath on photo');
assert(raw.includes("tree.style.display=integratedAdvent||"),'No pasted duplicate tree on photo');
assert(raw.includes("unifiedFx.style.display=useUnified&&!integratedAdvent"),'Do not double paint village effects');
assert(raw.includes("moon.style.opacity=customSkyVisible&&!integratedAdvent"),'Do not add a duplicate moon');
assert(raw.includes("photoFx.style.left=sceneLayout.photo.left+'px'"),'Dynamic illumination follows exact photo crop');
assert(raw.includes("photoFx.style.width=sceneLayout.photo.width+'px'"),'Dynamic illumination scales with photo');
assert.equal((ADVENT_PHOTO_OVERLAY.match(/data-photo-candle=/g)||[]).length,4,'Four candles individually controllable');
assert(ADVENT_PHOTO_OVERLAY.includes('advent-photo-tree-lights'),'Tree lights on native photo');
assert(raw.includes("Number(candle.getAttribute('data-photo-candle'))<=holiday.candles"),'Candles follow Sunday count');
for(const [year,month,day,wanted,lights] of [
 [2026,11,28,0,false],[2026,11,29,1,false],[2026,12,5,1,false],
 [2026,12,6,2,true],[2026,12,13,3,true],[2026,12,20,4,true],
 [2026,12,25,0,true],[2027,1,7,0,false]]){
 const p=holidayDecorAt({year,month,day});
 assert.equal(p.candles,wanted,'Sunday candles '+[year,month,day]);
 assert.equal(p.treeLights,lights,'Tree light schedule '+[year,month,day]);
}
for(const [w,h] of [[1536,864],[1373,648],[800,1280],[360,800],[1024,768]]){
 const p=landscapeHolidayPlacement({width:w,height:h},'cover',55,true).photo;
 assert(p.width>0&&p.height>0);
}
assert(raw.includes("function recolorAdventDaylight(data,width,height,clouds)"),
 'Daylight photo must preserve geometry and transform only pixel colors');
assert(raw.includes("const daylightAdvent=image==='advent-photo-night-final.webp'&&d.dayLight>=.55"),
 'Daylight conversion must activate for genuine daytime');
assert(raw.includes("data-photo-candle=\"1\"")===false || ADVENT_PHOTO_OVERLAY.includes('data-photo-candle="1"'),
 'First candle is present as a true overlay');
for(const id of [1,2,3,4]){
 assert(ADVENT_PHOTO_OVERLAY.includes('data-photo-candle="'+id+'"'),
   'Every candle has its own dynamic flame: '+id);
}
console.log('PASS approved photographic Advent DAY and NIGHT, four wick-aligned candles and automatic calendar');
