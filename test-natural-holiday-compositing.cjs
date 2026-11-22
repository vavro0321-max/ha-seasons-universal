'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
  .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
  HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.comp={HOLIDAY_COMPOSITED,holidayDecorAt,landscapeHolidayPlacement};',ctx);
const {HOLIDAY_COMPOSITED,holidayDecorAt,landscapeHolidayPlacement}=ctx.comp;
const domSelectors=[
  'tree-ground-shadow','wreath-ground-shadow',
  'tree-ground-light','wreath-ground-light','holiday-wall-reflection',
  'real-wreath-base','real-tree-unlit','real-tree-lit'
];
for(const selector of domSelectors){
  assert(HOLIDAY_COMPOSITED.includes(selector),'Compositor missing '+selector);
}
assert(source.includes('${HOLIDAY_COMPOSITED}${ADVENT_PHOTO_OVERLAY}<div class="information">'),
  'Screensaver uses the composited image, not the old flat overlay');
assert(source.includes("position.left+position.width*.5"),
  'Light pool x must use each decoration centre');
assert(source.includes("position.groundY+position.width*dy"),
  'Contact shadow and light must be anchored to ground contact y');
assert(source.includes("phot.left+568/1536*phot.width"),
  'Church wall reflection must follow photo crop/scale');
assert(source.includes("const treeVisible=!integratedAdvent&&holiday.tree&&this._config.show_christmas_tree!==false"),
  'Respect hide-tree switch');
assert(source.includes("const wreathVisible=!integratedAdvent&&holiday.advent&&this._config.show_advent_wreath!==false"),
  'Respect hide-wreath switch');
assert(source.includes("treeVisible&&holiday.treeLights"),
  'No tree illumination before St Nicholas');
assert(source.includes("wreathVisible&&holiday.candles>0"),
  'Wreath illumination is conditioned on Advent candles');
assert(source.includes("else{wallReflection.style.display='none'"),
  'Church bounce must be hidden when tree is not lit');
assert(source.includes("if(!sceneLayout||!visible){node.style.display='none'"),
  'Unsupported custom backgrounds must not show ungrounded light pools');
for(const [y,m,d,candles,lights] of [
  [2026,11,29,1,false],[2026,12,5,1,false],[2026,12,6,2,true],
  [2026,12,13,3,true],[2026,12,20,4,true],[2027,1,7,0,false]
]){
 const p=holidayDecorAt({year:y,month:m,day:d});
 assert.equal(p.candles,candles,'Advent candles preserved: '+[y,m,d]);
 assert.equal(p.treeLights,lights,'Mikuláš switch preserved: '+[y,m,d]);
}
for(const dims of [[1536,864],[1373,648],[800,1280],[360,800],[420,910]]){
 const r=landscapeHolidayPlacement({width:dims[0],height:dims[1]},'cover',55,true);
 for(const kind of ['tree','wreath']){
  const p=r[kind],centre=p.left+p.width/2;
  assert(centre>=0&&centre<=dims[0],'Contact pool on-screen: '+kind+' '+dims);
  assert(p.groundY>0&&p.groundY<=dims[1],'Contact pool at terrain: '+kind+' '+dims);
 }
}
console.log('PASS holiday compositing: scene-grounded shadows, light pools, church bounce, Advent dates, responsive geometry');
