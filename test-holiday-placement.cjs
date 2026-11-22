'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const raw=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8');
const source=raw.replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.geometry=landscapeHolidayPlacement;',ctx);
const get=ctx.geometry;
const native=get({width:1536,height:864},'cover',55,true);
assert(Math.abs(native.tree.groundY-720)<.01,'Approved tree base must touch the church lawn');
assert(Math.abs(native.wreath.groundY-798)<.01,'Approved wreath base must rest next to the path');
assert(native.tree.left>520&&native.tree.left<545,'Tree stands directly beside the church as in the approved image');
assert(native.wreath.left>native.tree.left&&native.wreath.left<native.tree.left+125,'Wreath must stay close to the tree and path');
// Resolutions cover 16:9, 16:10, 4:3, ultra-wide, portrait tablets and phones.
// Resize must recompute a SINGLE common photo/overlay/decor transform.
for(const dims of [[1536,864],[1373,648],[780,360],[1280,800],[1024,768],
                   [1920,820],[3840,2160],[800,1280],[768,1024],[360,800],[420,910]]){
 for(const fit of ['cover','contain']){
  const box={width:dims[0],height:dims[1]},layout=get(box,fit,55,true);
  const scene=layout.photo;
  assert(scene.width>0&&scene.height>0,'Photo has positive size');
  assert(scene.width/scene.height>1.77&&scene.width/scene.height<1.79,
    'The original panorama is not stretched or distorted');
  if(scene.portrait){
   assert(scene.width>=box.width,'Portrait photo spans the device width');
   assert(scene.top>=0,'Portrait photo does not start above the viewport');
   assert(scene.top+scene.height<=box.height+.001,
     'Portrait photo remains entirely inside the viewport');
  }
  for(const [name,aspect,landmarkX,landmarkY] of [
     ['tree',137/120,610,720],['wreath',93/174,690,798]]){
   const p=layout[name];
   assert(p.left>=0&&p.left+p.width<=box.width+.01,
      name+' must remain visible: '+dims+' '+fit);
   assert(p.top>=0&&p.groundY<=box.height+.01,
      name+' must stay vertically inside the device: '+dims+' '+fit);
   assert(Math.abs(p.top+p.width*aspect-p.groundY)<.0001,
      name+' must be anchored by its base: '+dims+' '+fit);
   assert(Math.abs((p.left+p.width/2)-(scene.left+landmarkX/1536*scene.width))<.001,
      name+' must follow the same horizontally cropped background');
   assert(Math.abs(p.groundY-(scene.top+landmarkY/864*scene.height))<.001,
      name+' must follow the same vertically cropped background');
  }
  assert(layout.wreath.left>layout.tree.left,
    'Wreath stays right of the tree, beside the winding path');
 }
}
// Verify CSS photo / unified fx / decorations use the same layout values.
assert(raw.includes("const sceneLayout=usingCustom?null:landscapeHolidayPlacement("));
assert(raw.includes("photo.style.backgroundSize=sceneLayout?"));
assert(raw.includes("unifiedMap.style.left=sceneLayout.photo.left+'px'"));
assert(raw.includes("view.style.left=sceneLayout.photo.left+'px'"));
assert(raw.includes("sceneLayout.tree],[wreath,sceneLayout.wreath]"));
assert(raw.includes("this._config.show_advent_wreath===false"),'Wreath switch preserved');
assert(raw.includes("this._config.show_christmas_tree===false"),'Tree switch preserved');
assert(raw.includes("tree.querySelector('.real-tree-unlit').style.filter=foliageFilter"),'Real tree receives night exposure correction');
assert(raw.includes("wreath.querySelector('.real-wreath-base').style.filter=foliageFilter"),'Real wreath receives night exposure correction');
assert(raw.includes("tree.style.setProperty('--ground-glow'"),'Tree casts subtle illumination on ground');
assert(raw.includes("wreath.style.setProperty('--ground-glow'"),'Wreath casts subtle illumination on ground');
console.log('PASS: 1.10.6 approved tree/wreath landmarks, shared photo/crop and rotation across 11 device sizes × 2 fits');
