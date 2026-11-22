'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
const code=src.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const context={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(context);
vm.runInContext(code+'\nglobalThis.snowFns={winterPhotographicAsset,deepSnowLandscape,holidayDecorAt,getInputs};',context);
const {winterPhotographicAsset,deepSnowLandscape,holidayDecorAt,getInputs}=context.snowFns;
for(const filename of ['advent-snow-day.webp','advent-snow-night.webp','advent-snow-night-unlit.webp','winter-snow-landscape.webp']){
 const b=fs.readFileSync(__dirname+'/dist/assets/'+filename);
 assert(b.length>95000,'Real photographic asset not provided: '+filename);
 assert.equal(b.toString('ascii',0,4),'RIFF','RIFF '+filename);
 assert.equal(b.toString('ascii',8,12),'WEBP','WebP '+filename);
}
const p=(scene,precipitation,nightLight,advent,lights)=>({scene,precipitation,nightLight,holiday:{advent,treeLights:lights}});
const cases=[
 [p('christmas','snow',0,true,false),'advent-snow-day.webp'],
 [p('christmas','snow',1,true,false),'advent-snow-night-unlit.webp'],
 [p('nicholas','snow',1,true,true),'advent-snow-night.webp'],
 [p('winter','snow',0,false,false),'winter-snow-landscape.webp'],
 [p('winter','none',0,false,false),'winter-snow-landscape.webp'],
 [p('winter','none',0,false,false),'winter-snow-landscape.webp','snow'],
 [p('winter','snow',0,false,false),null,'bare']
];
for(const [data,want,manual] of cases)
 assert.equal(winterPhotographicAsset(data,manual?{snow_landscape:manual}:{}),want,
   'Photo selection '+JSON.stringify({data,manual}));
assert.equal(deepSnowLandscape(p('winter','none',0,false,false),{}),true,
 'A winter photograph may show snow cover even while no snow is falling');
assert.equal(deepSnowLandscape(p('winter','none',0,false,false),{snow_landscape:'bare'}),false,
 'Explicit no-snow winter landscape setting must still work');
assert.equal(winterPhotographicAsset(p('summer','none',0,false,false),{}),null,
 'Snowy winter landscape must not appear outside winter');
const nonadvent=p('winter','snow',0,false,false);
assert.equal(winterPhotographicAsset(nonadvent,{}),'winter-snow-landscape.webp',
 'Ordinary winter after Three Kings must never contain Advent decorations');
for(const [day,candles,treeLights] of [[29,1,false],[30,1,false]]){
 const h=holidayDecorAt({year:2026,month:11,day});
 assert.equal(h.candles,candles);assert.equal(h.treeLights,treeLights);
}
for(const [day,candles] of [[6,2],[13,3],[20,4]]){
 const h=holidayDecorAt({year:2026,month:12,day});
 assert.equal(h.candles,candles);
 assert.equal(h.treeLights,true);
}
assert(src.includes('const snowWicks=[[-12,3],[-13,6],[-8,1],[-5,-2]]'),
 'Snowy candle flames must be individually aligned to their real wicks');
assert(src.includes("candle.setAttribute('transform','translate('+dx+' '+dy+')')"),
 'All flames must move together with the photo geometry');
assert(src.includes("this._select('snow_landscape','Sneh na zemi')"),
 'User must be able to keep photographed snow after snowfall stops');
assert(src.includes("snowFile||(useUnified?preferred:assetName(d))"),
 'Existing non-snow seasonal backgrounds must be preserved');
assert(src.includes("unifiedFx.style.display=useUnified&&!integratedAdvent&&!winterSnowPhoto"),
 'Winter photo must not have a misaligned duplicate overlay');
console.log('PASS: winter scenery persists without falling snow, 4 snow photos, Advent candles and separate no-snow setting');
