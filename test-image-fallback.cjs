const fs=require('fs'),vm=require('vm'),assert=require('assert');
const script=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
 .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
class MissingImage{
 set src(value){this.url=value;if(this.onerror)this.onerror(new Error('Simulated missing image'));} 
}
const ctx={
 window:{customCards:[]},customElements:{get:()=>undefined,define:()=>{}},
 HTMLElement:class {},Date,Intl,URL,Math,console,devicePixelRatio:1,
 Image:MissingImage
};
vm.createContext(ctx);
vm.runInContext(script+'\nglobalThis.AuditedCard=HASeasonsUniversalCard;',ctx);
const card=Object.create(ctx.AuditedCard.prototype);
const photo={style:{backgroundImage:''}};
const root={querySelector: s => s==='.photo'?photo:null};
card._root=root;
card._config={unified_scene:true,season_colors:false};
card._imageToken=0;
card._lastImage=null;
card._missingImages=new Set();
const late={scene:'autumn',leafless:true,clouds:'partly',p:{month:11,day:21}};
card._setSeasonPhoto('universal-landscape-leafless.webp',late);
assert(card._missingImages.has('universal-landscape-leafless.webp'),'Missing photo must be remembered');
assert(photo.style.backgroundImage.includes('autumn-full-v81-partly.webp'),'Fallback should show built-in autumn photo');
const firstToken=card._imageToken;
assert(firstToken>=2,'Missing photo triggers a fallback image selection');
// If the unification files are fixed later, refreshing the page resets missing-image state.
const second=Object.create(ctx.AuditedCard.prototype);
second._root=root;second._config={unified_scene:false,season_colors:false};
second._imageToken=0;
second._setSeasonPhoto('autumn-full-v81-partly.webp',late);
assert(photo.style.backgroundImage.includes('autumn-full-v81-partly.webp'));
console.log('PASS missing source photos fall back safely to built-in scenery without JS exceptions');
