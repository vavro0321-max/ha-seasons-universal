'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
  .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const context={
  window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},
  Date,Intl,URL,Math,console,devicePixelRatio:1,
  CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}}
};
vm.createContext(context);
vm.runInContext(code+
  '\nglobalThis.photoTest={customPhotoUrl,chooseCustomPhoto,visualSeason,HASeasonsUniversalCard,HASeasonsUniversalEditor};',context);
const {customPhotoUrl,chooseCustomPhoto,HASeasonsUniversalCard,HASeasonsUniversalEditor}=context.photoTest;
const d=(scene,snowCover=0,precipitation='none')=>({scene,snowCover,precipitation,dayLight:1,nightLight:0});
assert.equal(customPhotoUrl('/local/moja-foto.jpg'),'/local/moja-foto.jpg','Same-origin photos accepted');
assert.equal(customPhotoUrl('/local/krajina.webp?v=2'),'/local/krajina.webp?v=2');
assert.equal(customPhotoUrl('https://example.org/pic.png'),'https://example.org/pic.png');
assert.equal(customPhotoUrl('javascript:alert(1)'),null,'Disallow script URL');
assert.equal(customPhotoUrl('data:image/svg+xml;base64,a'),null,'Disallow data URI');
assert.equal(customPhotoUrl('//evil.example/pic.jpg'),null,'Disallow protocol-relative URL');
assert.equal(customPhotoUrl('/local/"bad.png'),null,'Avoid CSS injection');
assert.equal(chooseCustomPhoto({},d('spring')),null,'Original landscape stays default');
const base={custom_image:'/local/moja-krajina.jpg'};
for(const scene of ['spring','summer','autumn','winter','easter','christmas']){
 const p=chooseCustomPhoto(base,d(scene));
 assert.equal(p.src,'/local/moja-krajina.jpg');
 assert.equal(p.graded,true,'Single photo must get dynamic seasonal styling');
}
const mult={custom_image:'/local/zaklad.jpg',custom_images:{
 spring:'/local/jar.jpg',summer:'/local/leto.jpg',autumn:'/local/jesen.webp',
 winter:'/local/zima.webp',winter_dry:'/local/zima-bez-snehu.jpg'
}};
for(const [scene,expected] of [['spring','jar.jpg'],['summer','leto.jpg'],['autumn','jesen.webp'],['winter','zima-bez-snehu.jpg'],['easter','jar.jpg'],['christmas','zima-bez-snehu.jpg']]){
 const p=chooseCustomPhoto(mult,d(scene));
 assert(p.src.endsWith(expected),scene);
 assert.equal(p.graded,false,'Own seasonal photo should not be re-colored');
}
assert(chooseCustomPhoto(mult,d('winter',.6,'snow')).src.endsWith('zima.webp'),'Snowy winter');
const partial={custom_images:{spring:'/local/jar.jpg'}};
assert.equal(chooseCustomPhoto(partial,d('spring')).graded,false);
assert.equal(chooseCustomPhoto(partial,d('autumn')).graded,true,'Partial seasonal set uses fallback image with tint');
assert.equal(chooseCustomPhoto(partial,d('autumn')).src,'/local/jar.jpg');
assert.equal(chooseCustomPhoto(mult,d('spring'),new Set(['/local/jar.jpg'])).src,'/local/zaklad.jpg','Missing image fallback');
assert.equal(chooseCustomPhoto(base,d('spring'),new Set(['/local/moja-krajina.jpg'])),null,'All missing => built-in fallback');
const card=Object.create(HASeasonsUniversalCard.prototype);
card.setConfig({idle_seconds:30,custom_image:'/local/moja-krajina.jpg',custom_sky_objects:false});
assert.equal(card._config.show_waste,true,'Keep previous waste feature');
assert.equal(card._config.night_brightness,1.1,'Keep night light');
assert.equal(card._config.pause_on_camera,true,'Keep camera pause');
assert.equal(card._config.custom_image,'/local/moja-krajina.jpg');
const editor=Object.create(HASeasonsUniversalEditor.prototype);
editor._config={};
let emitted=null;
editor.dispatchEvent=e=>{emitted=e;};
const label={textContent:''};
editor.shadowRoot={querySelector:()=>label};
editor._onChanged({target:{dataset:{image:'base'},value:'/local/test.jpg'}});
assert.equal(editor._config.custom_image,'/local/test.jpg');
assert.equal(emitted.type,'config-changed');
editor._onChanged({target:{dataset:{image:'winter'},value:'/local/zima.webp'}});
assert.equal(editor._config.custom_images.winter,'/local/zima.webp');
editor._onChanged({target:{dataset:{image:'winter'},value:''}});
assert.equal(editor._config.custom_images.winter,undefined,'Clearing custom season removes override');
editor._onChanged({target:{dataset:{number:'custom_season_strength'},value:'1.1'}});
assert.equal(editor._config.custom_season_strength,1.1);
assert(label.textContent.includes('110'),'Strength label updates');
assert(code.includes('data-image="base"')&&code.includes('data-image="\${key}"'),'Graphical photo input fields present');
assert(code.includes("stage.style.display=isPhotoSeason&&!useUnified&&!usingCustom"),'No old village-specific elements on own photo');
assert(code.includes("unifiedFx.style.display=useUnified&&!integratedAdvent?'block':'none'"),'No duplicate village lights on Advent photo or own photo');
assert(code.includes("const integratedAdvent=!usingCustom&&d.holiday.advent"),'Own photo remains selected instead of integrated Advent image');
assert(code.includes('customSkyVisible'), 'Sky toggle present for arbitrary photos');
assert(!code.includes('livingPaintActor'),'No walkers/cars');
console.log('PASS customizable photo URLs; 4 seasons; winter snow/dry; bad-photo fallback; editor; existing HA features preserved');
