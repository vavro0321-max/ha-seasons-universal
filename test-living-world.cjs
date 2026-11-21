const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
 .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const ctx={window:{customCards:[],matchMedia:()=>({matches:false})},customElements:{get:()=>undefined,define:()=>{}},
 HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1.2};
vm.createContext(ctx);
vm.runInContext(source+"\nglobalThis.livingTest={livingPoint,livingLimits,livingSpawn,livingCreateWorld,livingStep,livingPaintActor,LIVING_ROUTES,HASeasonsUniversalCard};",ctx);
const {livingPoint,livingLimits,livingSpawn,livingCreateWorld,livingStep,livingPaintActor,LIVING_ROUTES,HASeasonsUniversalCard}=ctx.livingTest;
const at=(hour,precipitation='none',fogLevel=0)=>({p:{hour},precipitation,fogLevel,nightLight:hour<6||hour>=20?1:0,scene:hour<6?'autumn':'summer'});
const morning=at(9),night=at(2),rain=at(11,'rain',0),fog=at(11,'none',.6);
const dayLimits=livingLimits(morning,{});
assert(dayLimits.person>=3&&dayLimits.car>=1&&dayLimits.bird>=1,'day should be lively');
assert(livingLimits(night,{}).bird===0,'night birds must sleep');
assert(livingLimits(rain,{}).bird===0,'rain prevents birds flying');
assert(livingLimits(fog,{}).bird===0,'dense fog prevents birds flying');
assert(livingLimits(rain,{}).person<dayLimits.person,'bad weather reduces pedestrians');
assert(livingLimits(morning,{living_world:false}).person===0,'master toggle disables all actors');
assert(livingLimits(morning,{living_people:false}).person===0,'pedestrian toggle');
assert(livingLimits(morning,{living_cars:false}).car===0,'traffic toggle');
assert(livingLimits(morning,{living_birds:false}).bird===0,'birds toggle');
assert(livingLimits(morning,{living_density:'high'}).person>livingLimits(morning,{living_density:'low'}).person,'density');
const w=livingCreateWorld(morning,{},()=>.35);
assert(w.actors.some(x=>x.kind==='person')&&w.actors.some(x=>x.kind==='bird'),'initial activity');
const original=w.actors[0].t;
livingStep(w,.2,morning,{},()=>.99);
assert(w.actors[0].t!==original,'actor travels between frames');
for(let i=0;i<300;i++)livingStep(w,.2,morning,{},()=>0);
for(const kind of ['person','car','bird']){
 assert(w.actors.filter(a=>a.kind===kind).length<=livingLimits(morning,{})[kind],'respect population limits');
}
for(const route of ['walking','walkingFar','car']){
 const path=LIVING_ROUTES[route];
 for(const t of [0,.3,.5,.8,1]){
  const p=livingPoint(path,t);
  assert(p.x>=0&&p.x<=1536&&p.y>=0&&p.y<=864,'ground route should stay on photograph');
 }
}
let commands=0;
const noop=()=>{commands++};
const mock=new Proxy({}, {get(t,key){return key in t?t[key]:noop},set(t,k,v){t[k]=v;return true;}});
for(const kind of ['person','bird','car']){
 livingPaintActor(mock,{kind,route:kind==='person'?'walking':kind,dir:1,t:.5,phase:1.2,color:0},18,morning);
}
assert(commands>15,'drawing calls for people, car, birds');
const card=Object.create(HASeasonsUniversalCard.prototype);
card._config={living_world:true,living_density:'normal',image_fit:'cover',image_focus:55};
card._data=morning;card._livingOnScene=true;card._livingFrame=0;card._livingWorld=null;
const canvas={width:0,height:0,getBoundingClientRect:()=>({width:800,height:480}),getContext:()=>mock};
card._root={querySelector:(selector)=>selector==='.livingfx'?canvas:null};
card._drawLivingWorld(500);
assert(canvas.width===960&&canvas.height===576,'retina resolution on tablet');
assert(card._livingWorld&&card._livingWorld.actors.length>=1,'render creates simulation');
card._config.living_world=false;
card._drawLivingWorld(720);
assert(card._livingWorld===null,'disabling clears the world');
assert(source.includes('canvas class="livingfx"'),'Canvas must be mounted');
assert(source.includes("prefers-reduced-motion: reduce"),'Respect reduced motion accessibility');
assert(source.includes("living_density:[['low'"),'Editor density selector');
assert(source.includes("living_world:'Živá dedina"),'Editor master toggle');
console.log('PASS Living World: paths, motion, day/night, rain/fog, density, drawing, tablet scale, off switch');
