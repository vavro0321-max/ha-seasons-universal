'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const raw=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
const source=raw.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.geometry=landscapeHolidayPlacement;',ctx);
const get=ctx.geometry;
const native=get({width:1536,height:864},'cover',55,true);
assert(Math.abs(native.tree.groundY-706)<.01,'Tree base must meet the lawn');
assert(Math.abs(native.wreath.groundY-752)<.01,'Wreath base must rest next to path');
assert(native.tree.left>560&&native.tree.left<600,'Tree stands immediately right of church');
assert(native.wreath.left<native.tree.left,'Wreath should be closer to the path');
for(const dims of [[1536,864],[1373,648],[780,360],[648,1373],[360,800]]){
 for(const fit of ['cover','contain']){
  const box={width:dims[0],height:dims[1]},pos=get(box,fit,55,true);
  for(const [name,aspect] of [['tree',137/120],['wreath',93/174]]){
   const p=pos[name];
   assert(p.left>=0&&p.left+p.width<=box.width+1,
      name+' must remain visible: '+dims+' '+fit);
   assert(Math.abs(p.top+p.width*aspect-p.groundY)<.0001,
      name+' must be anchored by its base, not its top: '+dims+' '+fit);
   assert(p.width>0,'Sprite width must be positive');
  }
 }
}
assert(raw.includes("this._config.show_advent_wreath===false"),'Wreath switch preserved');
assert(raw.includes("this._config.show_christmas_tree===false"),'Tree switch preserved');
console.log('PASS: 1.10.3 photo-grounded holiday decorations in wide, cropped and portrait layouts');
