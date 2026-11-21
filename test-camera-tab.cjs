const fs=require('fs'),vm=require('vm'),assert=require('assert');
let code=fs.readFileSync(__dirname+'/dist/ha-seasons-universal.js','utf8')
  .replace("const ASSETS=new URL('./assets/',import.meta.url).href;","const ASSETS='/assets/';");
const win={location:{pathname:'/lovelace/2',hash:''},customCards:[]};
const ctx={window:win,document:{hidden:false},customElements:{get:()=>undefined,define:()=>{}},HTMLElement:class{},Date,Intl,URL,Math,console,devicePixelRatio:1};
vm.createContext(ctx);
vm.runInContext(code+'\nglobalThis.TestCard=HASeasonsUniversalCard;',ctx);
const card=Object.create(ctx.TestCard.prototype);
card._config={pause_on_camera:true,idle_seconds:30};
card._last=Date.now()-100000;
card._visible=false;
card.isConnected=true;
card._hass={};
card._editing=()=>false;
card._open=()=>{card.openCount=(card.openCount||0)+1;card._visible=true;};
card._close=()=>{card.closeCount=(card.closeCount||0)+1;card._visible=false;};
card._update=()=>{};
function at(path,hash){win.location.pathname=path;win.location.hash=hash;return card._cameraActive();}
for(const hash of ['#kamery','#KAMERY','#camera','#cameras','#kamera','#kamery?foo=bar','#kamery/stream']){
 assert(at('/lovelace/2',hash),hash+' should block screensaver');
}
assert(at('/lovelace/kamery',''),"Dedicated Lovelace camera path blocks screensaver");
assert(at('/lovelace/cameras',''),"English camera view blocks screensaver");
assert(!at('/lovelace/2','#meteo'),"Weather popup should not block screensaver");
assert(!at('/lovelace/2','#viac'),"Other popup should not block screensaver");
assert(!at('/lovelace/2',''),"Home should not block screensaver");
at('/lovelace/2','#kamery');
card._last=Date.now()-100000;
card._onTick();
assert.equal(card.openCount||0,0,'Camera view must not open screensaver even after long inactivity');
assert(Date.now()-card._last<1000,'Camera countdown should keep resetting');
card._visible=true;
card._onNavigation();
assert.equal(card.closeCount,1,'Opening cameras must dismiss an already visible screensaver');
at('/lovelace/2','#meteo');
card._onNavigation();
assert(Date.now()-card._last<1000,'Leaving cameras must restart idle timeout');
card._onTick();
assert.equal(card.openCount||0,0,'No immediate opening after leaving camera popup');
card._last=Date.now()-40000;
card._onTick();
assert.equal(card.openCount,1,'Screensaver resumes after normal idle time on another tab');
card._visible=false;
card._config.pause_on_camera=false;
assert(!at('/lovelace/2','#kamery'),'Explicit opt-out must permit screensaver on cameras');
console.log('PASS Kamery popup and camera views pause screensaver; exiting restarts 30-second countdown');
