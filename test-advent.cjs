const fs=require('fs'),vm=require('vm'),assert=require('assert');
let source=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
source=source.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.fn={adventStartUtc,holidayDecorAt,seasonAt,getInputs,landscapeHolidayPlacement};',ctx);
const {adventStartUtc,holidayDecorAt,seasonAt,getInputs}=ctx.fn;
assert.equal(new Date(adventStartUtc(2026)).toISOString().slice(0,10),'2026-11-29');
assert.equal(new Date(adventStartUtc(2027)).toISOString().slice(0,10),'2027-11-28');
assert.equal(new Date(adventStartUtc(2028)).toISOString().slice(0,10),'2028-12-03');
const cases=[
  [2026,11,28,'autumn',0,false,false],
  [2026,11,29,'christmas',1,true,false],
  [2026,12,5,'christmas',1,true,false],
  [2026,12,6,'nicholas',2,true,true],
  [2026,12,13,'christmas',3,true,true],
  [2026,12,20,'christmas',4,true,true],
  [2026,12,24,'christmas',4,true,true],
  [2026,12,25,'christmas',0,false,true],
  [2026,12,31,'newyear',0,false,true],
  [2027,1,1,'newyear',0,false,true],
  [2027,1,6,'christmas',0,false,true],
  [2027,1,7,'winter',0,false,false],
  [2028,12,2,'winter',0,false,false],
  [2028,12,3,'christmas',1,true,false]
];
for(const [year,month,day,scene,candles,advent,lights] of cases){
  const p={year,month,day},decor=holidayDecorAt(p);
  assert.equal(seasonAt(p),scene,'scene '+[year,month,day]);
  assert.equal(decor.candles,candles,'candle count '+[year,month,day]);
  assert.equal(decor.advent,advent,'wreath visibility '+[year,month,day]);
  assert.equal(decor.treeLights,lights,'tree light schedule '+[year,month,day]);
}
const hass={config:{time_zone:'Europe/Bratislava'},states:{'sun.sun':{state:'above_horizon',attributes:{elevation:25,azimuth:180}},'weather.home':{state:'sunny',attributes:{temperature:1}}}};
const date=new Date('2026-12-13T12:00:00Z');
const daylight=getInputs(hass,{scene:'auto'},date);
assert.equal(daylight.holiday.candles,3);
assert(daylight.nightLight<0.01,'candle flames and tree lights off by day');
hass.states['sun.sun']={state:'below_horizon',attributes:{elevation:-15,azimuth:255}};
const night=getInputs(hass,{scene:'auto'},date);
assert(night.nightLight>0.99,'candles and tree lights fully visible after dusk');
assert(source.includes("show_advent_wreath:true,show_christmas_tree:true"));
assert(source.includes("tree.querySelector('.tree-lights').style.opacity=glow.toFixed(3)"));
assert(source.includes('christmas-tree-lit.webp'),'real tree lights asset used');
assert(source.includes('christmas-tree-unlit.webp'),'unlit tree asset used before 6 December');
assert(source.includes('advent-wreath-unlit.webp'),'real Advent wreath asset used');
assert(source.includes('advent-candle-flame.webp'),'real candle flame asset used');
// Check geometry rather than a fragile exact source-code string.
const positions=ctx.fn.landscapeHolidayPlacement({width:1536,height:864},'cover',55,true);
assert.equal(positions.tree.groundY,732,'Tree must touch the church lawn');
assert.equal(positions.wreath.groundY,776,'Wreath must rest on grass beside the path');
assert(positions.wreath.left>positions.tree.left,'Wreath is on the path-side grass, away from foreground fence');
assert(!source.includes('viewBox=\\\"0 0 230 160\\\"'),
  'cartoon wreath SVG must not return');
console.log('PASS Advent calendar, candle counts, St Nicholas tree, local day/night and config (14 dates)');
