/* HA Seasons Universal 1.5.0 — moonlit scenery, village lights, clouds and temperature-dependent frost. */
const VERSION='1.5.0';
const ASSETS=new URL('./assets/',import.meta.url).href;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const smoothstep=(lo,hi,x)=>{const t=clamp((x-lo)/(hi-lo),0,1);return t*t*(3-2*t);};
const knownWeather=['sunny','clear-night','partlycloudy','cloudy','rainy','pouring','lightning-rainy','snowy','snowy-rainy','fog','hail','lightning','windy','windy-variant','exceptional'];
const MOONS=['new_moon','waxing_crescent','first_quarter','waxing_gibbous','full_moon','waning_gibbous','last_quarter','waning_crescent'];
const MOON_SK=['Nov','Dorastajúci kosáčik','Prvá štvrť','Dorastajúci Mesiac','Spln','Ubúdajúci Mesiac','Posledná štvrť','Ubúdajúci kosáčik'];
function localParts(now,timeZone){
  try {const a=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(now);
    return Object.fromEntries(a.filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
  catch {return {year:now.getFullYear(),month:now.getMonth()+1,day:now.getDate(),hour:now.getHours(),minute:now.getMinutes()};}
}
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),q=h+l-7*m+114;return Date.UTC(y,Math.floor(q/31)-1,q%31+1);}
function seasonAt(p){const y=p.year,m=p.month,d=p.day,delta=(Date.UTC(y,m-1,d)-easter(y))/86400000;
  if((m===12&&d===31)||(m===1&&d===1))return 'newyear';
  if((m===12&&d>=16)||(m===1&&d<=6))return 'christmas';
  if(m===12&&d===6)return 'nicholas';
  if(m===11&&d<=2)return 'memorial';
  if(delta>=-3&&delta<=1)return 'easter';
  if(m===5&&d<=8)return 'may';
  return m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter';
}
function state(hass,id){return id?hass?.states?.[id]:undefined;}
function safeNumber(v){if(v===null||v===undefined||v===''||v==='unavailable'||v==='unknown')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function numberFor(hass,id){return safeNumber(state(hass,id)?.state);}
function unitFor(hass,id){return String(state(hass,id)?.attributes?.unit_of_measurement||'').toLowerCase().replace(/\s+/g,'');}
function toCelsius(n,unit){return n===null?null:(unit==='°f'||unit==='f'?(n-32)*5/9:n);}
function toKmh(n,unit){if(n===null)return null;return unit==='m/s'?n*3.6:(unit==='mph'?n*1.609344:(unit==='kn'||unit==='kt'?n*1.852:n));}
function pick(hass,forced,candidates=[],predicate=null){if(forced&&forced!=='auto')return forced;for(const id of candidates)if(state(hass,id))return id;if(predicate)return Object.keys(hass?.states||{}).find(id=>predicate(id,state(hass,id)))||null;return null;}
function weatherId(hass,forced){return pick(hass,forced,['weather.forecast_cierne_11','weather.home'],(id,s)=>id.startsWith('weather.')&&knownWeather.includes(s?.state));}
function getInputs(hass,config,now=new Date()){
  const cfg=config.entities||{},p=localParts(now,hass?.config?.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone);
  const wId=weatherId(hass,cfg.weather),wo=state(hass,wId),wx=knownWeather.includes(wo?.state)?wo.state:'unavailable';
  const localMode=config.source!=='online';
  const tempId=localMode?pick(hass,cfg.temperature,['sensor.ws2900_v2_02_01_outdoor_temperature'],(id,s)=>id.startsWith('sensor.')&&s?.attributes?.device_class==='temperature'&&/outdoor|outside|vonku|external|vonkaj|exteri/i.test(id+' '+(s.attributes.friendly_name||''))):null;
  const rainId=localMode?pick(hass,cfg.rain,['sensor.ws2900_v2_02_01_rain_rate'],(id,s)=>id.startsWith('sensor.')&&/rain_rate|rain_intensity|precipitation_intensity|intenzita_dazda/.test(id)):null;
  const solarId=localMode?pick(hass,cfg.solar,['sensor.ws2900_v2_02_01_solar_radiation'],id=>id.startsWith('sensor.')&&/solar_radiation|slnecne_ziarenie/.test(id)):null;
  const windId=localMode?pick(hass,cfg.wind,['sensor.ws2900_v2_02_01_wind_speed'],(id,s)=>id.startsWith('sensor.')&&/wind_speed|rychlost_vetra/.test(id)):null;
  const gustId=localMode?pick(hass,cfg.gust,['sensor.ws2900_v2_02_01_wind_gust'],id=>id.startsWith('sensor.')&&/wind_gust|narazy_vetra/.test(id)):null;
  const humidityId=localMode?pick(hass,cfg.humidity,['sensor.ws2900_v2_02_01_humidity'],id=>id.startsWith('sensor.')&&/outdoor.*humidity|humidity.*outdoor|ws2900.*humidity/.test(id)):null;
  const dewpointId=localMode?pick(hass,cfg.dewpoint,['sensor.ws2900_v2_02_01_dewpoint'],id=>id.startsWith('sensor.')&&/dewpoint|dew_point|rosny_bod/.test(id)):null;
  const sun=state(hass,'sun.sun'),elevation=safeNumber(sun?.attributes?.elevation),azimuth=safeNumber(sun?.attributes?.azimuth);
  let temperature=toCelsius(numberFor(hass,tempId),unitFor(hass,tempId));
  if(temperature===null)temperature=toCelsius(safeNumber(wo?.attributes?.temperature),String(wo?.attributes?.temperature_unit||'°C').toLowerCase());
  let rain=numberFor(hass,rainId);if(rain!==null&&unitFor(hass,rainId).includes('in/h'))rain*=25.4;
  let solar=numberFor(hass,solarId);
  let wind=toKmh(numberFor(hass,windId),unitFor(hass,windId));
  if(wind===null)wind=toKmh(safeNumber(wo?.attributes?.wind_speed),String(wo?.attributes?.wind_speed_unit||'km/h').toLowerCase());
  const gust=toKmh(numberFor(hass,gustId),unitFor(hass,gustId));
  const humidity=numberFor(hass,humidityId)??safeNumber(wo?.attributes?.humidity);
  const dewpoint=toCelsius(numberFor(hass,dewpointId),unitFor(hass,dewpointId));
  const dewGap=temperature!==null&&dewpoint!==null?temperature-dewpoint:null;
  // Prefer a direct weather.fog signal. Only estimate fog with near-saturated,
  // nearly windless air; never infer fog from low temperature alone.
  const fogEstimate=humidity!==null&&humidity>=94&&dewGap!==null&&dewGap<=1.4&&(wind===null||wind<9);
  const fogLevel=config.fog_effect===false?0:wx==='fog'?.83:(fogEstimate?clamp(.30+(humidity-94)*.045+Math.max(0,1.4-dewGap)*.11,.25,.68):0);
  const weatherValid=wx!=='unavailable';
  const rainWeather=['rainy','pouring','lightning-rainy'].includes(wx);
  let precipitation='none',intensity=0,estimated=false;
  if(['snowy','snowy-rainy'].includes(wx)&&(temperature===null||temperature<=2)){
    precipitation='snow';intensity=wx==='snowy-rainy'?0.36:0.49;estimated=true;
  }else if(rain!==null&&rain>0.025){precipitation='rain';intensity=clamp(Math.log1p(rain)/Math.log1p(22),0.05,1);}
  else if(rain===null&&rainWeather){precipitation='rain';intensity=wx==='pouring'?0.85:0.34;estimated=true;}
  let clouds=wx==='partlycloudy'||wx==='windy-variant'?'partly':wx==='cloudy'||wx==='fog'||['rainy','pouring','lightning-rainy','snowy','snowy-rainy','hail'].includes(wx)?'overcast':'clear';
  if(!weatherValid&&solar!==null&&elevation!==null&&elevation>10){const expected=Math.max(150,900*Math.sin(elevation*Math.PI/180)),ratio=solar/expected;clouds=ratio<.30?'overcast':ratio<.67?'partly':'clear';}
  if(precipitation!=='none')clouds='overcast';
  const scene=config.scene&&config.scene!=='auto'?config.scene:seasonAt(p);
  const phase=config.phase&&config.phase!=='auto'?config.phase:(elevation!==null?(elevation<=-6?'night':elevation<10?(sun?.attributes?.rising?'dawn':'dusk'):'day'):(sun?.state==='below_horizon'?'night':p.hour<8?'dawn':p.hour>=17?'dusk':'day'));
  const isNight=phase==='night';
  // Solar elevation is continuous from dawn through sunset and throughout the night.
  // Use the HA sun.sun elevation; only fall back to a time-of-day estimate when it is missing.
  const manual=config.phase&&config.phase!=='auto';
  const solarElevation=manual?({day:22,dawn:1,dusk:1,night:-24}[config.phase]??0):
    (elevation!==null?elevation:(sun?.state==='below_horizon'?-19:(p.hour<9||p.hour>=16?4:20)));
  const dayLight=smoothstep(-12,20,solarElevation);
  const nightLight=1-smoothstep(-13,-2,solarElevation);
  const deepNight=1-smoothstep(-65,-12,solarElevation);
  const warmth=smoothstep(-8,-1,solarElevation)*(1-smoothstep(4,16,solarElevation));
  const lunar=moonPhase(hass,cfg.moon,now);
  const illuminated=(1-Math.cos(lunar.index*Math.PI/4))/2; // new moon 0, full moon 1
  const moonTransmission=clouds==='clear'?1:clouds==='partly'?.48:.06;
  const moonlight=config.moonlight_effect===false?0:nightLight*moonTransmission*(.12+.88*illuminated);
  // Twilight has more ambient light than midnight. A moonlit clear night is brighter
  // than a cloudy one, but landscape features remain discernible in both.
  const solarRatio=solar!==null&&solarElevation>0?clamp(solar/Math.max(150,900*Math.sin(solarElevation*Math.PI/180)),0,1.5):null;
  const cloudFactor=clouds==='overcast'?.80:clouds==='partly'?.93:1.04;
  const solarBoost=solarRatio===null?0:clamp((solarRatio-.55)*.14,-.07,.11)*dayLight;
  const daylightBrightness=(.50+.54*dayLight)*cloudFactor+solarBoost;
  const nightBrightness=(.30+.12*(1-deepNight))*(clouds==='overcast'?.94:1)+moonlight*(.035+.10*deepNight);
  const brightness=clamp(daylightBrightness*(1-nightLight)+nightBrightness*nightLight,.22,1.17);
  // Visual frost is an estimate based on temperature, season and snow reports; it is
  // NOT a measured depth of real snow on the ground. No falling snow unless reported.
  const coldness=temperature===null?0:1-smoothstep(-7,2.5,temperature);
  const reportedSnow=precipitation==='snow';
  const snowCover=temperature===null?(scene==='winter'?.20:0):clamp((scene==='winter'?.14:0)+coldness*(scene==='winter'?.65:scene==='autumn'||scene==='spring'?.58:.20)+(reportedSnow?.17:0),0,.94);
  // Leafless from 10 November through winter; on cold October nights
  // leaves may fall earlier. Manual spring/season testing stays respected.
  const leafless=['winter','christmas','nicholas','newyear'].includes(scene) ||
    (scene==='autumn'&&((p.month===11&&p.day>=10)||(p.month===10&&temperature!==null&&temperature<0)));
  return {p,wId,weather:wx,temperature,rain,solar,wind:wind??0,gust:gust??0,scene,phase,isNight,clouds,precipitation,intensity,estimated,brightness,elevation,azimuth,solarElevation,dayLight,nightLight,deepNight,warmth,lunar,moonlight,snowCover,fogLevel,humidity,dewpoint,leafless};
}

// All four seasons previously reused visually near-identical green source photos.
// Apply vegetation-selective grading so the sky, church, mountain and path stay intact.
function visualSeason(scene){
  if(scene==='memorial')return 'autumn';
  if(scene==='easter'||scene==='may')return 'spring';
  if(scene==='christmas'||scene==='nicholas'||scene==='newyear')return 'winter';
  return scene;
}
function seasonStrength(scene,p){
  const m=p.month,day=p.day;
  if(scene==='autumn'){
    if(m===9)return .38+day/30*.24;
    if(m===10)return .63+day/31*.22;
    return .96;
  }
  if(scene==='spring')return m===3?.54:m===4?.90:.76;
  return scene==='summer'?.86:0;
}
function recolorSeasonalPixels(data,width,height,scene,strength){
  if(!['spring','summer','autumn'].includes(scene))return data;
  const pixels=data,scale=clamp(strength,0,1);
  for(let i=0;i<pixels.length;i+=4){
    const red=pixels[i],green=pixels[i+1],blue=pixels[i+2];
    // Vegetation has green above blue and does not have a strongly red hue.
    // This excludes the blue sky, snow, white church, gray rock and red roofs.
    const vegetation=clamp((green-blue-12)/52,0,1)*clamp((green-red*.66-4)/45,0,1);
    if(vegetation<.025)continue;
    const a=vegetation*scale;
    if(scene==='autumn'){
      pixels[i]=red+(230-red)*a*.58;
      pixels[i+1]=green*(1-.39*a)+12*a;
      pixels[i+2]=blue*(1-.24*a);
    }else if(scene==='spring'){
      pixels[i]=red*(1-.13*a)+6*a;
      pixels[i+1]=green*(1+.08*a)+12*a;
      pixels[i+2]=blue*(1+.06*a)+4*a;
    }else{
      pixels[i]=red*(1-.14*a);
      pixels[i+1]=green*(1+.06*a)+5*a;
      pixels[i+2]=blue*(1+.03*a);
    }
  }
  return pixels;
}
const UNIFIED_SCENE_FX="<svg class=\"unified-map\" viewBox=\"0 0 1536 864\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\">\n<defs>\n  <radialGradient id=\"usGlow\"><stop stop-color=\"#ffe7ad\" stop-opacity=\".94\"/><stop offset=\".16\" stop-color=\"#ffd17b\" stop-opacity=\".57\"/><stop offset=\"1\" stop-color=\"#ffbb66\" stop-opacity=\"0\"/></radialGradient>\n  <linearGradient id=\"usSnow\" x1=\"0\" x2=\"0\" y1=\"0\" y2=\"1\"><stop stop-color=\"#d9e8f6\" stop-opacity=\".05\"/><stop offset=\".35\" stop-color=\"#e5eef9\" stop-opacity=\".40\"/><stop offset=\"1\" stop-color=\"#e9f1fb\" stop-opacity=\".80\"/></linearGradient>\n  <radialGradient id=\"usFog\"><stop stop-color=\"#c6d5de\" stop-opacity=\".62\"/><stop offset=\".72\" stop-color=\"#c8d8e0\" stop-opacity=\".37\"/><stop offset=\"1\" stop-color=\"#ccdbe2\" stop-opacity=\"0\"/></radialGradient>\n</defs>\n<g class=\"us-snow\">\n <path fill=\"url(#usSnow)\" d=\"M0 572 Q310 602 620 572 Q900 597 1536 540 L1536 864 L0 864 Z\"/>\n <path fill=\"#f0f5fb\" opacity=\".16\" d=\"M0 678 Q415 706 840 686 T1536 654 L1536 864 L0 864 Z\"/>\n</g>\n<g class=\"us-fog\">\n <ellipse cx=\"854\" cy=\"510\" rx=\"750\" ry=\"108\" fill=\"url(#usFog)\"/>\n <ellipse cx=\"1210\" cy=\"575\" rx=\"620\" ry=\"112\" fill=\"url(#usFog)\"/>\n <ellipse cx=\"415\" cy=\"625\" rx=\"595\" ry=\"85\" fill=\"url(#usFog)\" opacity=\".73\"/>\n</g>\n<g class=\"us-lights\" fill=\"url(#usGlow)\">\n  <ellipse cx=\"382\" cy=\"250\" rx=\"35\" ry=\"43\"/><ellipse cx=\"414\" cy=\"304\" rx=\"28\" ry=\"36\"/>\n  <ellipse cx=\"302\" cy=\"478\" rx=\"40\" ry=\"29\"/><ellipse cx=\"460\" cy=\"504\" rx=\"33\" ry=\"34\"/>\n  <ellipse cx=\"838\" cy=\"532\" rx=\"35\" ry=\"28\"/><ellipse cx=\"921\" cy=\"555\" rx=\"31\" ry=\"24\"/>\n  <ellipse cx=\"989\" cy=\"543\" rx=\"27\" ry=\"24\"/><ellipse cx=\"1054\" cy=\"536\" rx=\"29\" ry=\"23\"/>\n  <ellipse cx=\"1134\" cy=\"551\" rx=\"28\" ry=\"23\"/><ellipse cx=\"1202\" cy=\"554\" rx=\"29\" ry=\"23\"/>\n  <ellipse cx=\"1265\" cy=\"544\" rx=\"24\" ry=\"20\"/><ellipse cx=\"1342\" cy=\"543\" rx=\"31\" ry=\"23\"/>\n</g>\n</svg>";
const supportedScenes=['spring','summer','autumn','winter','christmas','easter','may','memorial','nicholas','newyear'];
function assetName(d){
  // A single landscape stays mounted throughout the entire solar cycle. Switching
  // day/night pictures here causes visibly doubled trees, mountains and houses.
  const scene=d.scene;
  const mapDay={spring:'spring-full-v81',summer:'summer-full-v81',autumn:'autumn-full-v81',winter:'winter-full-v81'};
  if(mapDay[scene]){const base=mapDay[scene];return `${base}${d.clouds==='partly'?'-partly':d.clouds==='overcast'?'-overcast':''}.webp`;}
  if(supportedScenes.includes(scene))return `${scene}-day.svg`;
  return 'autumn-full-v81.webp';
}
function moonPhase(hass,forced,now){const ids=[forced,'sensor.moon_faza','sensor.moon_phase','sensor.moon'].filter(Boolean);
  for(const id of ids){const raw=String(state(hass,id)?.state||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[-\s]+/g,'_');
    let idx=MOONS.indexOf(raw);if(idx<0)idx=({nov:0,spln:4,prva_stvrt:2,posledna_stvrt:6,dorastajuci_kosacik:1,dorastajuci_mesiac:3,ubudajuci_mesiac:5,cuvajuci_mesiac:5,ubudajuci_kosacik:7,cuvajuci_kosacik:7})[raw]??-1;
    if(idx>=0)return {index:idx,label:MOON_SK[idx],estimate:false};}
  const age=((now.getTime()/86400000+2440587.5-2451550.1)/29.5305889%1+1)%1;const idx=Math.floor(age*8+.5)%8;return {index:idx,label:MOON_SK[idx],estimate:true};
}
function moonDraw(canvas,idx){const ctx=canvas.getContext('2d');if(!ctx)return;const w=canvas.width=96,h=canvas.height=96,r=38,x0=48,y0=48,p=idx/8;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(24,39,64,.85)';ctx.beginPath();ctx.arc(x0,y0,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f0f1da';for(let y=-r;y<=r;y++){const half=Math.sqrt(Math.max(0,r*r-y*y));if(p<=.5){const x=half*Math.cos(2*Math.PI*p);ctx.fillRect(x0+x,y0+y,Math.max(0,half-x),1.5);}else {const right=-half*Math.cos(2*Math.PI*(p-.5));ctx.fillRect(x0-half,y0+y,Math.max(0,right+half),1.5);}}
  ctx.beginPath();ctx.arc(x0,y0,r,0,Math.PI*2);ctx.strokeStyle='rgba(230,242,255,.4)';ctx.lineWidth=1.2;ctx.stroke();
}
function fmtTime(hass,dt){if(!dt)return '—';const d=new Date(dt);if(Number.isNaN(d.getTime()))return '—';return d.toLocaleTimeString('sk-SK',{timeZone:hass?.config?.time_zone||undefined,hour:'2-digit',minute:'2-digit'});}
function cardReadings(hass,config,d){const x=config.entities||{};let heating=state(hass,x.heating||'switch.thermostat_switch');let heat='—';
  if(heating&&['on','off'].includes(heating.state))heat=heating.state==='on'?'Kúri':'Nekúri';else {
    const climates=Object.entries(hass?.states||{}).filter(([id])=>id.startsWith('climate.'));
    heat=climates.some(([,v])=>v.attributes?.hvac_action==='heating')?'Kúri':climates.length?'Nekúri':'—';}
  const nameday=state(hass,x.nameday||'sensor.meniny_dnes')?.state;const namedayText=!nameday||['unknown','unavailable'].includes(nameday)?'—':nameday;
  const ids=Array.isArray(x.lights)&&x.lights.length?x.lights:Object.keys(hass?.states||{}).filter(id=>id.startsWith('light.'));
  const on=ids.filter(id=>state(hass,id)?.state==='on').length;const avail=ids.filter(id=>['on','off'].includes(state(hass,id)?.state)).length;
  return {temperature:d.temperature===null?'—':`${d.temperature.toFixed(1).replace('.',',')} °C`,heating:heat,nameday:namedayText,lighting:avail?`${on} zapnuté / ${avail}`:'—'};
}
const STYLE=`
:host{display:block;width:100%;height:1px;overflow:hidden;pointer-events:none}
#anchor{height:1px;width:1px;opacity:0}
`;
const OVERLAY_STYLE=`
:host{all:initial;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;position:fixed;inset:0;z-index:2147483000;pointer-events:auto;}
.screen{position:fixed;inset:0;width:100vw;width:100dvw;height:100vh;height:100dvh;overflow:hidden;background:#081729;touch-action:manipulation;user-select:none;cursor:pointer;--glass-opacity:.48;--font-factor:1;isolation:isolate}
.photo{position:absolute;inset:0;background-size:cover;background-position:center center;background-repeat:no-repeat;transition:filter 5s ease,background-image .5s linear}
.tint{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,rgba(3,13,30,.17),rgba(6,17,37,.03) 45%,rgba(1,11,24,.30));}
.nightveil{position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(180deg,rgba(2,9,35,.30) 0%,rgba(4,12,34,.24) 45%,rgba(0,3,19,.38) 100%);transition:opacity 6s ease;}
.skyshade{position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(180deg,rgba(1,8,24,.92),rgba(3,15,33,.53) 34%,rgba(4,15,30,.1) 61%,transparent 78%);transition:opacity 6s ease;}
.moonwash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse 76% 76% at 82% 25%,rgba(189,218,255,.22),rgba(123,173,231,.11) 48%,transparent 90%);mix-blend-mode:screen;transition:opacity 7s ease;}
.cloudshade{position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(180deg,rgba(68,83,109,.47) 0%,rgba(39,54,77,.24) 44%,transparent 82%);transition:opacity 6s ease;}
.unifiedfx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}
.unifiedfx .unified-map{position:absolute;max-width:none;max-height:none;overflow:visible}
.unifiedfx .us-fog,.unifiedfx .us-lights,.unifiedfx .us-snow{transition:opacity 8s ease}
.sceneryfx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1}
.sceneryfx svg{position:absolute;max-width:none;max-height:none;overflow:visible;transition:opacity 6s ease;}
.sceneryfx .village-lights,.sceneryfx .frost-cover{transition:opacity 8s ease}
.warmth{position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(180deg,rgba(255,133,41,.19),rgba(255,115,31,.26) 36%,rgba(255,169,62,.09) 63%,transparent 95%);mix-blend-mode:screen;transition:opacity 5s ease;}
.stars{position:absolute;inset:0 0 56% 0;pointer-events:none;opacity:0;transition:opacity 6s ease;background-image:radial-gradient(circle at 8% 15%,#fff 0 1px,transparent 1.7px),radial-gradient(circle at 25% 38%,#fff 0 .7px,transparent 1.5px),radial-gradient(circle at 42% 12%,#fff 0 1px,transparent 1.7px),radial-gradient(circle at 58% 30%,#fff 0 .8px,transparent 1.5px),radial-gradient(circle at 76% 11%,#fff 0 1px,transparent 1.7px),radial-gradient(circle at 91% 39%,#fff 0 .7px,transparent 1.5px),radial-gradient(circle at 68% 54%,#fff 0 1px,transparent 1.7px),radial-gradient(circle at 35% 65%,#fff 0 .8px,transparent 1.5px);background-repeat:no-repeat;}
.weatherfx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.shadowTree{position:absolute;bottom:9%;left:7%;height:5%;width:30%;background:radial-gradient(ellipse,rgba(12,20,24,.30),transparent 75%);filter:blur(10px);transform-origin:0% 50%;transition:transform 8s linear,opacity 2s;pointer-events:none}
.sun{position:absolute;width:clamp(46px,7vh,90px);height:clamp(46px,7vh,90px);border-radius:50%;background:radial-gradient(circle,#fff9d7 0%,#ffcd72 38%,#ffcc7955 62%,transparent 78%);filter:drop-shadow(0 0 18px #ffcf7b);transform:translate(-50%,-50%);opacity:.75;transition:left 12s linear,top 12s linear,opacity 3s;pointer-events:none;mix-blend-mode:screen}
.moon{position:absolute;top:8%;right:12%;width:clamp(55px,9vh,96px);opacity:0;transition:opacity 5s ease;filter:drop-shadow(0 0 14px rgba(235,239,255,.38));pointer-events:none;z-index:1}
.leaves{position:absolute;inset:0;pointer-events:none;overflow:hidden;opacity:.68}
.leaf{position:absolute;width:7px;height:3px;border-radius:100% 2px;background:rgba(228,176,90,.22);animation:sway var(--speed) ease-in-out infinite alternate;top:var(--top);left:var(--left);transform-origin:20px 30px;animation-delay:var(--delay)}
@keyframes sway{from{transform:rotate(-9deg) translateX(-1px)}to{transform:rotate(9deg) translateX(2px)}}
.information{position:absolute;top:max(env(safe-area-inset-top,0px),clamp(12px,4vh,45px));left:50%;transform:translateX(-50%);width:min(94%,1120px);max-height:85%;box-sizing:border-box;text-align:center;z-index:2;text-shadow:0 2px 14px #0b192d;display:flex;flex-direction:column;align-items:center}
.clock{font-size:calc(clamp(54px,13vh,130px) * var(--font-factor));font-weight:720;line-height:1.03;letter-spacing:-.06em;font-variant-numeric:tabular-nums}
.date{font-size:clamp(14px,2.6vh,22px);margin-top:4px}
.statusbar{display:grid;width:100%;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(6px,1.4vw,14px);margin-top:clamp(10px,4vh,28px)}
.status{box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;min-height:clamp(70px,13vh,130px);padding:10px 6px;border-radius:17px;border:1px solid rgba(210,230,252,.35);background:rgba(4,20,39,var(--glass-opacity));backdrop-filter:blur(8px);box-shadow:0 4px 16px #06172833}
.status b{font-size:clamp(14px,2.2vw,27px);font-weight:680;overflow-wrap:anywhere}.status small{font-size:clamp(9px,1.6vw,13px);letter-spacing:.07em;text-transform:uppercase;color:#cbd9eb}.icon{font-size:clamp(18px,3.4vh,29px)}
.extra{margin:clamp(8px,2vh,14px) auto 0;display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-size:clamp(11px,1.4vw,15px);color:#ebf2fc}
.tap{position:absolute;bottom:max(3%,env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);background:rgba(5,20,38,.68);border:1px solid #a8bbd144;border-radius:22px;padding:10px 20px;font-size:clamp(12px,2vw,15px);white-space:nowrap;z-index:4}
@media (max-width:650px){.information{top:4%}.clock{font-size:clamp(46px,12vh,80px)}.statusbar{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:10px}.status{min-height:70px;padding:7px 4px}.status b{font-size:16px}.extra{font-size:11px;gap:6px}.tap{bottom:3%}}
/* Auto tablet layout: landscape uses four columns; portrait uses two without changing dashboard. */
@media (orientation:portrait){
 .information{width:min(93vw,760px);top:max(6%,env(safe-area-inset-top,0px))}
 .clock{font-size:calc(clamp(56px,12vh,118px) * var(--font-factor))}
 .statusbar{grid-template-columns:repeat(2,minmax(0,1fr));max-width:min(700px,92vw);row-gap:9px;margin-top:clamp(12px,3vh,34px)}
 .status{min-height:clamp(82px,12vh,144px)}
 .status b{font-size:clamp(14px,3.8vw,23px)}
 .status small{font-size:clamp(10px,2.4vw,13px)}
 .extra{max-width:95%;margin-top:clamp(12px,3vh,26px);line-height:1.6}
 .photo{background-position:55% center}
}
@media (max-height:550px) and (orientation:landscape){
 .information{top:3%;width:min(94%,1100px)}
 .clock{font-size:calc(clamp(42px,15vh,80px) * var(--font-factor))}
 .date{font-size:clamp(11px,3vh,16px)}
 .statusbar{margin-top:6px;gap:7px}
 .status{min-height:52px;border-radius:12px;gap:2px;padding:3px 5px}
 .status b{font-size:clamp(12px,2.5vw,17px)}
 .status small{font-size:10px}
 .status .icon{font-size:15px}
 .extra{margin-top:5px;font-size:11px}
 .tap{padding:4px 13px;font-size:11px;bottom:2%}
}
@media (max-height:750px) and (orientation:portrait){
 .information{top:2%}
 .clock{font-size:calc(clamp(48px,10vh,85px) * var(--font-factor))}
 .statusbar{margin-top:8px}
 .status{min-height:60px;padding:5px}
 .extra{margin-top:6px}
 .tap{padding:6px 12px}
}
.screen[data-layout="compact"] .information{top:2%;width:min(94vw,980px)}
.screen[data-layout="compact"] .clock{font-size:calc(clamp(43px,10vh,86px) * var(--font-factor))}
.screen[data-layout="compact"] .status{min-height:60px;padding:6px}
.screen[data-layout="compact"] .extra{margin-top:5px}
.screen[data-layout="wide"] .information{width:min(97vw,1350px)}
.screen[data-layout="wide"] .statusbar{grid-template-columns:repeat(4,minmax(0,1fr))}
.screen[data-style="minimal"] .status{background:rgba(0,8,16,calc(var(--glass-opacity) * .6));backdrop-filter:none;box-shadow:none;border-color:rgba(255,255,255,.16)}
.screen[data-style="minimal"] .tap{background:rgba(0,8,16,.35);border:0}
@media (prefers-reduced-motion:reduce){.leaf{animation:none}.sun,.shadowTree{transition:none}}

`;
const SCENE_SVG='<svg class="scene-map" viewBox="0 0 1672 941" aria-hidden="true" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">\n <defs><filter id="haWindowBlur" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="5"/></filter><linearGradient id="haSnowFall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7fcff" stop-opacity="0"/><stop offset=".25" stop-color="#f7fcff" stop-opacity=".09"/><stop offset="1" stop-color="#ecf6ff" stop-opacity=".56"/></linearGradient></defs>\n <g class="frost-cover" opacity="0"><g class="frost-normal"><path d="M0 690 C190 717 415 750 710 759 C950 764 1120 739 1270 751 C1400 773 1565 802 1672 823 L1672 941 L0 941 Z" fill="url(#haSnowFall)"/><path d="M0 804 C240 815 400 833 638 822 M0 865 C300 870 530 884 704 856 M1435 810 C1545 800 1613 818 1672 839" fill="none" stroke="#e9f9ff" stroke-width="14" opacity=".30"/></g><g class="frost-winter"><path d="M0 665 C220 690 412 713 635 722 C930 733 1090 694 1290 709 C1440 715 1565 744 1672 750 L1672 941 L0 941 Z" fill="url(#haSnowFall)"/></g></g>\n <g class="village-lights" opacity="0"><g class="lights-normal"><ellipse cx="1427" cy="655" rx="11.6" ry="14.3" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1427" cy="655" rx="3.4" ry="5.1" fill="#ffe4a7"/><ellipse cx="1467" cy="657" rx="11.6" ry="14.3" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1467" cy="657" rx="3.4" ry="5.1" fill="#ffe4a7"/><ellipse cx="1504" cy="657" rx="10.9" ry="13.4" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1504" cy="657" rx="3.2" ry="4.8" fill="#ffe4a7"/><ellipse cx="1573" cy="657" rx="10.9" ry="13.4" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1573" cy="657" rx="3.2" ry="4.8" fill="#ffe4a7"/><ellipse cx="1427" cy="522" rx="8.5" ry="10.5" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1427" cy="522" rx="2.5" ry="3.8" fill="#ffe4a7"/><ellipse cx="1456" cy="531" rx="8.5" ry="10.5" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1456" cy="531" rx="2.5" ry="3.8" fill="#ffe4a7"/><ellipse cx="1361" cy="682" rx="10.5" ry="13.0" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1361" cy="682" rx="3.1" ry="4.7" fill="#ffe4a7"/><ellipse cx="1319" cy="647" rx="7.5" ry="9.2" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1319" cy="647" rx="2.2" ry="3.3" fill="#ffe4a7"/><ellipse cx="1356" cy="648" rx="6.8" ry="8.4" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1356" cy="648" rx="2.0" ry="3.0" fill="#ffe4a7"/><ellipse cx="527" cy="685" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="525.6" y="683.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="549" cy="680" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="547.6" y="678.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="569" cy="674" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="567.6" y="672.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="609" cy="685" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="607.6" y="683.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="640" cy="674" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="638.6" y="672.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="667" cy="677" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="665.6" y="675.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="779" cy="681" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="777.6" y="679.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="803" cy="676" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="801.6" y="674.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="834" cy="681" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="832.6" y="679.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="861" cy="667" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="859.6" y="665.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="897" cy="674" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="895.6" y="672.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="922" cy="673" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="920.6" y="671.5" width="2.8" height="3" fill="#ffd790"/></g><g class="lights-winter"><ellipse cx="1438" cy="594" rx="10.5" ry="13.0" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1438" cy="594" rx="3.1" ry="4.7" fill="#ffe4a7"/><ellipse cx="1473" cy="595" rx="10.5" ry="13.0" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1473" cy="595" rx="3.1" ry="4.7" fill="#ffe4a7"/><ellipse cx="1515" cy="597" rx="9.9" ry="12.2" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1515" cy="597" rx="2.9" ry="4.3" fill="#ffe4a7"/><ellipse cx="1575" cy="596" rx="10.2" ry="12.6" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1575" cy="596" rx="3.0" ry="4.5" fill="#ffe4a7"/><ellipse cx="1429" cy="420" rx="6.8" ry="8.4" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1429" cy="420" rx="2.0" ry="3.0" fill="#ffe4a7"/><ellipse cx="1344" cy="608" rx="9.5" ry="11.8" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1344" cy="608" rx="2.8" ry="4.2" fill="#ffe4a7"/><ellipse cx="1303" cy="584" rx="7.1" ry="8.8" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1303" cy="584" rx="2.1" ry="3.2" fill="#ffe4a7"/><ellipse cx="1385" cy="587" rx="6.8" ry="8.4" fill="#ffad43" opacity=".72" filter="url(#haWindowBlur)"/><ellipse cx="1385" cy="587" rx="2.0" ry="3.0" fill="#ffe4a7"/><ellipse cx="496" cy="631" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="494.6" y="629.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="532" cy="624" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="530.6" y="622.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="563" cy="624" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="561.6" y="622.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="582" cy="620" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="580.6" y="618.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="773" cy="618" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="771.6" y="616.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="807" cy="613" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="805.6" y="611.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="837" cy="618" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="835.6" y="616.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="883" cy="608" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="881.6" y="606.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="927" cy="618" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="925.6" y="616.5" width="2.8" height="3" fill="#ffd790"/><ellipse cx="961" cy="619" rx="7" ry="5" fill="#ffb753" opacity=".60" filter="url(#haWindowBlur)"/><rect x="959.6" y="617.5" width="2.8" height="3" fill="#ffd790"/></g></g>\n</svg>';
class HASeasonsUniversalCard extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'}).innerHTML=`<style>${STYLE}</style><div id="anchor" aria-hidden="true"></div>`;this._config={idle_seconds:30,source:'auto',layout:'auto',style:'glass'};this._last=Date.now();this._weather=null;this._onActivity=this._onActivity.bind(this);this._onKey=this._onKey.bind(this);this._onTick=this._onTick.bind(this);this._onNavigation=this._onNavigation.bind(this);}
  setConfig(config){if(config&&typeof config!=='object')throw new Error('Konfigurácia musí byť objekt');this._config={idle_seconds:30,source:'auto',scene:'auto',layout:'auto',style:'glass',show_clock:true,show_date:true,show_temperature:true,show_heating:true,show_nameday:true,show_lights:true,show_weather:true,show_sun:true,show_moon:true,precipitation_animation:true,leaf_animation:true,night_lights:true,moonlight_effect:true,snow_cover:true,pause_on_camera:true,season_colors:true,unified_scene:true,fog_effect:true,...config};this._last=Date.now();}
  set hass(value){this._hass=value;if(this._visible)this._update();}
  getCardSize(){return 1;}
  static getStubConfig(){return {idle_seconds:30,source:'auto',layout:'auto'};}
  static getConfigElement(){return document.createElement('ha-seasons-universal-editor');}
  connectedCallback(){if(this._timer)return;for(const ev of ['pointerdown','touchstart','wheel','scroll'])window.addEventListener(ev,this._onActivity,true);window.addEventListener('keydown',this._onKey,true);window.addEventListener('hashchange',this._onNavigation);window.addEventListener('popstate',this._onNavigation);this._timer=window.setInterval(this._onTick,1000);this._onTick();}
  disconnectedCallback(){if(this._timer)window.clearInterval(this._timer);this._timer=null;for(const ev of ['pointerdown','touchstart','wheel','scroll'])window.removeEventListener(ev,this._onActivity,true);window.removeEventListener('keydown',this._onKey,true);window.removeEventListener('hashchange',this._onNavigation);window.removeEventListener('popstate',this._onNavigation);this._close();}
  _onActivity(e){if(this._visible){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation?.();e.stopPropagation();this._close();}this._last=Date.now();}
  _onKey(e){this._onActivity(e);}
  // Kamera in the user's dashboard is a Bubble Card pop-up (#kamery).
  // Check both the hash and named Lovelace camera views without touching the dashboard YAML.
  _cameraActive(){
    if(this._config.pause_on_camera===false)return false;
    const location=window.location||{};
    let hash=String(location.hash||'').replace(/^#+/,'').toLowerCase();
    try{hash=decodeURIComponent(hash);}catch{}
    const popup=hash.split(/[/?&]/,1)[0];
    if(['kamery','kamera','cameras','camera'].includes(popup))return true;
    let pathname=String(location.pathname||'').toLowerCase().replace(/\/+$/,'');
    try{pathname=decodeURIComponent(pathname);}catch{}
    return /(?:^|\/)(?:kamery|kamera|cameras|camera)$/.test(pathname);
  }
  _onNavigation(){
    this._last=Date.now();
    if(this._cameraActive()&&this._visible)this._close();
  }
  _editing(){return document.querySelector('hui-root')?.editMode||this.closest('hui-card')?.closest('hui-card-edit-mode')||window.location.search.includes('edit=1');}
  _onTick(){if(!this.isConnected)return;
    // Keep the countdown paused for the entire camera session; start a fresh 30s on return.
    if(this._cameraActive()){if(this._visible)this._close();this._last=Date.now();return;}
    if(this._visible){this._update();return;}if(document.hidden||this._editing()||!this._hass)return;
    if(Date.now()-this._last>=clamp(Number(this._config.idle_seconds)||30,5,3600)*1000)this._open();}
  _make(){this._host=document.createElement('div');this._host.setAttribute('data-ha-seasons-universal',VERSION);this._host.attachShadow({mode:'open'}).innerHTML=`<style>${OVERLAY_STYLE}</style><div class="screen" role="dialog" aria-label="HA Seasons – šetrič obrazovky"><div class="photo"></div><div class="tint"></div><div class="nightveil"></div><div class="skyshade"></div><div class="moonwash"></div><div class="cloudshade"></div><div class="warmth"></div><div class="stars"></div><div class="sceneryfx">${SCENE_SVG}</div><div class="unifiedfx">${UNIFIED_SCENE_FX}</div><div class="shadowTree"></div><div class="sun"></div><canvas class="moon" width="96" height="96"></canvas><div class="leaves"></div><canvas class="weatherfx"></canvas><div class="information"><div class="clock"></div><div class="date"></div><div class="statusbar"><div class="status"><div class="icon">🌡️</div><small>Vonku</small><b data-field="temperature">—</b></div><div class="status"><div class="icon">♨️</div><small>Kúrenie</small><b data-field="heating">—</b></div><div class="status"><div class="icon">🎁</div><small>Meniny dnes</small><b data-field="nameday">—</b></div><div class="status"><div class="icon">💡</div><small>Osvetlenie</small><b data-field="lighting">—</b></div></div><div class="extra"><span data-field="weather">—</span><span data-field="rise">🌅 —</span><span data-field="set">🌇 —</span><span data-field="moon">🌙 —</span></div></div><div class="tap">Dotkni sa obrazovky pre návrat</div></div>`;
    document.body.appendChild(this._host);this._root=this._host.shadowRoot;this._lastImage=null;
    const leaves=this._root.querySelector('.leaves');for(let i=0;i<12;i++){const n=document.createElement('i');n.className='leaf';n.style.setProperty('--top',`${7+(i%5)*6}%`);n.style.setProperty('--left',`${2+(i*13)%32}%`);n.style.setProperty('--delay',`${-(i%7)*.5}s`);leaves.append(n);}
  }
  _open(){if(this._visible||this._cameraActive())return;this._visible=true;this._make();this._update();this._animate();}
  showForDemo(){this._last=Date.now();this._open();}
  _close(){this._visible=false;if(this._raf)cancelAnimationFrame(this._raf);this._raf=null;this._host?.remove();this._host=null;this._root=null;}
  _setSeasonPhoto(image,d){
    const photo=this._root?.querySelector('.photo');if(!photo)return;
    const scene=visualSeason(d.scene);
    const grading=this._config.season_colors!==false&&['spring','summer','autumn'].includes(scene);
    const weight=grading?seasonStrength(scene,d.p):0;
    const key=image+'|'+scene+'|'+weight.toFixed(2)+'|'+grading;
    if(key===this._lastImage)return;
    this._lastImage=key;
    const token=this._imageToken=(this._imageToken||0)+1;
    const root=this._root,original='url("'+ASSETS+image+'")';
    const cache=this._seasonCache??(this._seasonCache=new Map());
    if(cache.has(key)){photo.style.backgroundImage=cache.get(key);return;}
    photo.style.backgroundImage=original;
    // Verify the optional photos exist in this HACS installation; if not, the
    // previous built-in scene remains available until the user uploads images.
    const fallback=()=>{
      if(!this._root||this._root!==root||this._imageToken!==token)return;
      if(image.startsWith('universal-landscape')){
        (this._missingImages??(this._missingImages=new Set())).add(image);
        this._lastImage=null;
        this._setSeasonPhoto(assetName(d),d);
      }
    };
    if(!grading){
      if(!image.startsWith('universal-landscape'))return;
      const probe=new Image();
      probe.onload=()=>{if(this._root===root&&this._imageToken===token){cache.set(key,original);photo.style.backgroundImage=original;}};
      probe.onerror=fallback;
      probe.src=ASSETS+image;
      return;
    }
    const picture=new Image();
    picture.onload=()=>{
      if(!this._root||this._root!==root||this._imageToken!==token)return;
      try{
        const canvas=document.createElement('canvas');
        const w=canvas.width=picture.naturalWidth,h=canvas.height=picture.naturalHeight;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(picture,0,0,w,h);
        const frame=ctx.getImageData(0,0,w,h);
        recolorSeasonalPixels(frame.data,w,h,scene,weight);
        ctx.putImageData(frame,0,0);
        // Spring is distinct from summer: small blossoms among the existing tree foliage.
        if(scene==='spring'){
          for(let n=0;n<450;n++){
            const x=Math.floor(((n*233+71)%997)/997*w*.48);
            const y=Math.floor(((n*127+89)%991)/991*h*.46);
            const i=(y*w+x)*4,r=frame.data[i],g=frame.data[i+1],b=frame.data[i+2];
            if(clamp((g-b-12)/52,0,1)*clamp((g-r*.66-4)/45,0,1)<.25)continue;
            const radius=(n%5===0?3.1:1.8)*weight;
            ctx.fillStyle=n%3===0?'rgba(255,235,227,.79)':'rgba(255,211,211,.67)';
            ctx.beginPath();ctx.arc(x,y,radius,0,2*Math.PI);ctx.fill();
          }
        }
        const data=canvas.toDataURL('image/webp',.87);
        const url='url("'+data+'")';
        cache.set(key,url);
        if(cache.size>7)cache.delete(cache.keys().next().value);
        if(this._root===root&&this._imageToken===token)photo.style.backgroundImage=url;
      }catch(error){
        // CORS, memory or canvas restrictions: always keep the original photo visible.
        if(this._root===root&&this._imageToken===token)photo.style.backgroundImage=original;
        console.warn('HA Seasons: sezónne zafarbenie nie je dostupné',error);
      }
    };
    picture.onerror=()=>{fallback();if(this._root===root&&this._imageToken===token)photo.style.backgroundImage=original;};
    picture.src=ASSETS+image;
  }
  _update(){if(!this._root||!this._hass)return;const d=getInputs(this._hass,this._config),now=new Date();this._data=d;const el=(s)=>this._root.querySelector(s);
    const screen=el('.screen');screen.dataset.layout=['auto','compact','wide'].includes(this._config.layout)?this._config.layout:'auto';screen.dataset.style=this._config.style==='minimal'?'minimal':'glass';screen.style.setProperty('--glass-opacity',String(clamp(Number(this._config.glass_opacity??0.48),0.2,0.9)));screen.style.setProperty('--font-factor',String(({small:0.82,normal:1,large:1.15})[this._config.clock_size]||1));
    const photo=el('.photo');photo.style.backgroundSize=this._config.image_fit==='contain'?'contain':'cover';photo.style.backgroundPosition=`${clamp(Number(this._config.image_focus??55),0,100)}% center`;
    const preferred=d.leafless?'universal-landscape-leafless.webp':'universal-landscape.webp';
    const useUnified=this._config.unified_scene!==false&&!this._missingImages?.has(preferred);
    const image=useUnified?preferred:assetName(d);
    this._setSeasonPhoto(image,d);
    const saturation=(d.clouds==='overcast'?.80:1.04)*(.70+.30*d.dayLight);
    photo.style.filter=`brightness(${d.brightness.toFixed(3)}) saturate(${saturation.toFixed(3)}) sepia(${(d.warmth*.17).toFixed(3)}) hue-rotate(${(-d.warmth*10).toFixed(1)}deg)`;
    el('.nightveil').style.opacity=(d.nightLight*(.15+.19*d.deepNight)).toFixed(3);
    el('.skyshade').style.opacity=(d.nightLight*(d.clouds==='overcast'?.61:d.clouds==='partly'?.69:.82)).toFixed(3);
    el('.moonwash').style.opacity=(d.moonlight*.80).toFixed(3);
    el('.cloudshade').style.opacity=(d.nightLight*(d.clouds==='overcast'?.58:d.clouds==='partly'?.24:0)).toFixed(3);
    el('.warmth').style.opacity=(d.warmth*.72).toFixed(3);
    el('.stars').style.opacity=(d.nightLight*(d.clouds==='overcast'?.015:d.clouds==='partly'?.18:.63)).toFixed(3);
    const isPhotoSeason=['spring','summer','autumn','winter'].includes(d.scene);
    const stage=el('.sceneryfx'),view=el('.scene-map'),bounds=el('.screen').getBoundingClientRect();
    const scale=(this._config.image_fit==='contain'?Math.min:Math.max)(bounds.width/1672,bounds.height/941);
    const sw=1672*scale,shh=941*scale;
    view.style.width=`${sw}px`;view.style.height=`${shh}px`;
    view.style.left=`${(bounds.width-sw)*clamp(Number(this._config.image_focus??55),0,100)/100}px`;
    view.style.top=`${(bounds.height-shh)/2}px`;
    stage.style.display=isPhotoSeason&&!useUnified?'block':'none';
    const unifiedFx=el('.unifiedfx'),unifiedMap=el('.unified-map');
    unifiedFx.style.display=useUnified?'block':'none';
    if(useUnified){
      const us=(this._config.image_fit==='contain'?Math.min:Math.max)(bounds.width/1536,bounds.height/864);
      const ww=1536*us,hh=864*us;
      unifiedMap.style.width=`${ww}px`;unifiedMap.style.height=`${hh}px`;
      unifiedMap.style.left=`${(bounds.width-ww)*clamp(Number(this._config.image_focus??55),0,100)/100}px`;
      unifiedMap.style.top=`${(bounds.height-hh)/2}px`;
      unifiedMap.querySelector('.us-lights').style.opacity=this._config.night_lights===false?'0':(d.nightLight*(.35+.65*d.deepNight)).toFixed(3);
      unifiedMap.querySelector('.us-fog').style.opacity=d.fogLevel.toFixed(3);
      unifiedMap.querySelector('.us-snow').style.opacity=this._config.snow_cover===false?'0':d.snowCover.toFixed(3);
    }
    const winter=d.scene==='winter';
    view.querySelector('.lights-normal').style.display=winter?'none':'block';
    view.querySelector('.lights-winter').style.display=winter?'block':'none';
    view.querySelector('.frost-normal').style.display=winter?'none':'block';
    view.querySelector('.frost-winter').style.display=winter?'block':'none';
    view.querySelector('.village-lights').style.opacity=this._config.night_lights===false?'0':(d.nightLight*(.35+.65*d.deepNight)).toFixed(3);
    view.querySelector('.frost-cover').style.opacity=this._config.snow_cover===false?'0':d.snowCover.toFixed(3);
    const sun=el('.sun');const elev=d.solarElevation,az=d.azimuth??(d.p.hour*15+90);
    sun.style.left=`${clamp(12+(az-65)/230*76,8,92)}%`;sun.style.top=`${clamp(54-elev*1.5,8,59)}%`;
    sun.style.opacity=(smoothstep(-4,3,elev)*(d.clouds==='overcast'?.05:d.clouds==='partly'?.23:.58)).toFixed(3);
    const sh=el('.shadowTree');sh.style.opacity=(smoothstep(0,14,elev)*(d.clouds==='overcast'?.08:.52)).toFixed(3);sh.style.transform=`skewX(${clamp((180-az)*.22,-35,35)}deg) scaleX(${clamp(1.8-Math.max(0,elev)/65,.65,1.8)})`;
    const moon=el('.moon');moon.style.opacity=(d.moonlight*(d.clouds==='overcast'?.04:1)).toFixed(3);
    const phase=d.lunar;if(d.nightLight>.01)moonDraw(moon,phase.index);
    el('.clock').textContent=now.toLocaleTimeString('sk-SK',{timeZone:this._hass.config?.time_zone||undefined,hour:'2-digit',minute:'2-digit'});
    el('.date').textContent=now.toLocaleDateString('sk-SK',{timeZone:this._hass.config?.time_zone||undefined,weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const values=cardReadings(this._hass,this._config,d);for(const [key,v] of Object.entries(values)){el(`[data-field="${key}"]`).textContent=v;}
    const visible={clock:'show_clock',date:'show_date',temperature:'show_temperature',heating:'show_heating',nameday:'show_nameday',lighting:'show_lights',weather:'show_weather',rise:'show_sun',set:'show_sun',moon:'show_moon'};
    for(const [field,opt] of Object.entries(visible)){const target=el(field==='clock'?'.clock':field==='date'?'.date':`[data-field="${field}"]`);const box=field==='temperature'||field==='heating'||field==='nameday'||field==='lighting'?target?.closest('.status'):target;if(box)box.style.display=this._config[opt]===false?'none':'';}
    el('.statusbar').style.display=['temperature','heating','nameday','lighting'].some(f=>this._config[visible[f]]!==false)?'grid':'none';
    const wdesc={sunny:'Jasno',partlycloudy:'Polooblačno',cloudy:'Zamračené',rainy:'Dážď',pouring:'Silný dážď',snowy:'Sneženie','snowy-rainy':'Sneh s dažďom',fog:'Hmla','clear-night':'Jasná noc'};
    el('[data-field="weather"]').textContent=`🌦️ ${wdesc[d.weather]|| (d.weather==='unavailable'?'Počasie nedostupné':d.weather)}${d.estimated?' (odhad)':''}`;
    el('[data-field="rise"]').textContent=`🌅 ${fmtTime(this._hass,state(this._hass,'sun.sun')?.attributes?.next_rising)}`;
    el('[data-field="set"]').textContent=`🌇 ${fmtTime(this._hass,state(this._hass,'sun.sun')?.attributes?.next_setting)}`;
    el('[data-field="moon"]').textContent=`🌙 ${phase.label}${phase.estimate?' (odhad)':''}`;
    el('.extra').style.display=['weather','rise','moon'].some(f=>this._config[visible[f]]!==false)?'flex':'none';
    const leafSway=clamp((d.wind+d.gust*.35)/25,.1,1.7);el('.leaves').style.opacity=this._config.leaf_animation!==false&&['autumn','spring','summer','easter','may'].includes(d.scene)?'.72':'0';for(const n of el('.leaves').children)n.style.setProperty('--speed',`${clamp(6-leafSway*2,1.7,7)}s`);
  }
  _animate(){const tick=(tm)=>{if(!this._visible||!this._root)return;const canvas=this._root.querySelector('.weatherfx'),r=canvas.getBoundingClientRect();if(r.width&&r.height){const dpi=Math.min(1.6,devicePixelRatio||1),w=Math.round(r.width*dpi),h=Math.round(r.height*dpi);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const ctx=canvas.getContext('2d');ctx.setTransform(dpi,0,0,dpi,0,0);ctx.clearRect(0,0,r.width,r.height);
      const d=this._data;if(d&&d.precipitation!=='none'&&this._config.precipitation_animation!==false){const amount=clamp(Math.round((d.precipitation==='rain'?22:17)+d.intensity*(d.precipitation==='rain'?190:125)),0,220),t=tm/1000,wind=clamp(d.wind/30,0,3);
        ctx.strokeStyle=d.precipitation==='rain'?'rgba(206,224,244,.42)':'rgba(243,247,255,.82)';ctx.fillStyle='rgba(244,248,255,.8)';ctx.lineWidth=d.precipitation==='rain'?1.25:1.6;
        for(let i=0;i<amount;i++){const seed=(i*0.61803398875)%1,seedY=(i*.41421356237)%1,speed=(d.precipitation==='rain'?320:45)*(0.6+seed*.9)*(0.8+d.intensity*.8),yy=(seedY*r.height+t*speed)%(r.height+25)-15,xx=(seed*r.width+t*wind*(d.precipitation==='rain'?25:17))%(r.width+25)-10;
          if(d.precipitation==='rain'){ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx-3-wind*3,yy+7+d.intensity*13);ctx.stroke();}
          else{ctx.beginPath();ctx.arc(xx,yy,1.4+seed*1.6,0,Math.PI*2);ctx.fill();}
        }
      }
    }this._raf=requestAnimationFrame(tick);};this._raf=requestAnimationFrame(tick);}
}
// Native Home Assistant graphical editor; no external libraries or network calls.
const EDITOR_STYLE=`
:host{display:block;font-family:var(--paper-font-body1_-_font-family,system-ui),sans-serif;color:var(--primary-text-color,#e6eef8)}
.wrapper{display:grid;gap:16px;padding:8px 2px 12px}.panel{border:1px solid var(--divider-color,#667);border-radius:14px;padding:14px;display:grid;gap:10px}
h3{font-size:16px;margin:0 0 5px;font-weight:650}p{font-size:12px;margin:0;color:var(--secondary-text-color,#abb)}
.field{display:grid;gap:5px;font-size:13px}.field select,.field input:not([type="checkbox"]){font:inherit;box-sizing:border-box;border:1px solid var(--divider-color,#667);background:var(--card-background-color,#213246);color:var(--primary-text-color,#fff);border-radius:8px;padding:8px;width:100%;min-width:0}
.field input[type="range"]{padding:0}.inline{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.check{display:flex;align-items:center;gap:8px;font-size:13px;min-height:30px}.check input{width:17px;height:17px;accent-color:var(--primary-color,#03a9f4)}
small{font-size:12px;color:var(--secondary-text-color,#abb)}
@media(max-width:350px){.checks,.inline{grid-template-columns:1fr}}
`;
const OPTIONS={
 source:[['auto','Automaticky – senzory + online'],['station','Meteostanica / lokálne senzory'],['online','Iba online počasie']],
 layout:[['auto','Automaticky podľa obrazovky'],['compact','Kompaktné'],['wide','Široké']],
 style:[['glass','Sklenené karty'],['minimal','Minimalistické']],
 clock_size:[['normal','Normálna'],['small','Menšia'],['large','Väčšia']],
 image_fit:[['cover','Vyplniť obrazovku (môže orezať kraje)'],['contain','Celá fotografia (môže mať okraje)']],
 scene:[['auto','Automaticky podľa roka'],['spring','Jar'],['summer','Leto'],['autumn','Jeseň'],['winter','Zima'],['christmas','Vianoce'],['easter','Veľká noc'],['may','Máj'],['memorial','Dušičky'],['nicholas','Mikuláš'],['newyear','Nový rok']],
 phase:[['auto','Automaticky podľa slnka'],['day','Deň'],['dawn','Svitanie'],['dusk','Súmrak'],['night','Noc']]
};
const OPTION_LABELS={show_clock:'Hodiny',show_date:'Dátum',show_temperature:'Vonkajšia teplota',show_heating:'Kúrenie',show_nameday:'Meniny',show_lights:'Svetlá',show_weather:'Stav počasia',show_sun:'Východ a západ slnka',show_moon:'Fáza Mesiaca',precipitation_animation:'Padajúci dážď / sneh',leaf_animation:'Pohyb lístia',night_lights:'Svetlá v dedine a kostolíku',pause_on_camera:'Nespúšťať šetrič pri otvorenej záložke Kamery',moonlight_effect:'Osvetlenie krajiny Mesiacom',snow_cover:'Snehová pokrývka a námraza podľa teploty (odhad)',unified_scene:'Jedna krajina pre všetky ročné obdobia (moje fotografie)',fog_effect:'Hmla podľa počasia a vlhkosti',season_colors:'Výrazné farby ročných období (jar, leto, jeseň)'};
const ENTITY_LABELS={weather:'Počasie (weather.*)',temperature:'Vonkajšia teplota',rain:'Intenzita dažďa',solar:'Slnečné žiarenie',wind:'Rýchlosť vetra',gust:'Nárazy vetra',humidity:'Vonkajšia vlhkosť (hmla)',dewpoint:'Rosný bod (hmla)',heating:'Kúrenie / termostat',nameday:'Meniny',moon:'Fáza Mesiaca',lights:'Svetlá – entity oddelené čiarkou'};
function escapeHtml(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
class HASeasonsUniversalEditor extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this._config={type:'custom:ha-seasons-universal-card',idle_seconds:30,source:'auto',layout:'auto'};}
 setConfig(config){this._config={...config};this._render();}
 set hass(hass){this._hass=hass;if(!this._rendered)this._render();else this._updateWeatherList();}
 _select(key,label){const val=this._config[key]??(key==='source'||key==='scene'||key==='layout'||key==='phase'?'auto':key==='clock_size'?'normal':'glass');return `<label class="field">${escapeHtml(label)}<select data-prop="${key}">${OPTIONS[key].map(([v,t])=>`<option value="${v}" ${v===val?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></label>`;}
 _render(){const c=this._config,check=(k,l)=>`<label class="check"><input type="checkbox" data-bool="${k}" ${c[k]===false?'':'checked'}>${escapeHtml(l)}</label>`,entity=(k,l)=>`<label class="field">${escapeHtml(l)}<input data-entity="${k}" value="${escapeHtml(k==='lights'?(Array.isArray(c.entities?.lights)?c.entities.lights.join(', '):''):(c.entities?.[k]||''))}" placeholder="Automaticky" spellcheck="false" list="seasons-entities"></label>`;
 this.shadowRoot.innerHTML=`<style>${EDITOR_STYLE}</style><div class="wrapper">
 <section class="panel"><h3>Spustenie a displej</h3><p>Šetrič nemení tvoj dashboard. Na šírku aj na výšku sa rozloženie prispôsobí automaticky.</p>
 <div class="inline"><label class="field">Spustiť po (sekundy)<input data-number="idle_seconds" type="number" min="5" max="3600" step="5" value="${clamp(Number(c.idle_seconds)||30,5,3600)}"></label>${this._select('layout','Rozloženie')}</div><div class="inline">${this._select('style','Vzhľad panelov')}${this._select('clock_size','Veľkosť hodín')}</div>
 ${this._select('image_fit','Prispôsobenie fotografie')}<label class="field">Posun fotografie do strán <small data-focus-text>${clamp(Number(c.image_focus??55),0,100)} %</small><input data-number="image_focus" type="range" min="0" max="100" step="1" value="${clamp(Number(c.image_focus??55),0,100)}"></label>
 <label class="field">Priehľadnosť kariet <small data-opacity-text>${Math.round((Number(c.glass_opacity??.48))*100)} %</small><input data-number="glass_opacity" type="range" min="0.2" max="0.9" step="0.05" value="${Number(c.glass_opacity??.48)}"></label></section>
 <section class="panel"><h3>Krajina a počasie</h3><div class="inline">${this._select('source','Zdroj počasia')}${this._select('scene','Ročné obdobie / sviatok')}</div>${this._select('phase','Denná doba')}</section>
 <section class="panel"><h3>Zobrazované informácie a animácie</h3><div class="checks">${Object.entries(OPTION_LABELS).map(([k,l])=>check(k,l)).join('')}</div></section>
 <section class="panel"><h3>Entity z Home Assistanta</h3><p>Prázdne polia znamenajú automatické vyhľadanie. Pri viacerých weather entitách vyber konkrétnu.</p>
 ${Object.entries(ENTITY_LABELS).map(([k,l])=>entity(k,l)).join('')}
 <datalist id="seasons-entities"></datalist></section>
 <small>Editor ukladá nastavenia ako konfiguráciu karty v dashborde. Bez zásahu do nastavenia ostatných kariet.</small></div>`;
 this.shadowRoot.querySelectorAll('input,select').forEach(node=>node.addEventListener(node.type==='range'?'input':'change',e=>this._onChanged(e)));
 this._rendered=true;this._updateWeatherList();
 }
 _updateWeatherList(){const list=this.shadowRoot.querySelector('#seasons-entities');if(!list||!this._hass)return;const ids=Object.keys(this._hass.states||{}).filter(x=>/^(weather|sensor|switch|light|climate)\./.test(x)).sort();list.replaceChildren(...ids.map(id=>{const o=document.createElement('option');o.value=id;return o;}));}
 _onChanged(e){const node=e.target,k=node.dataset.prop,bo=node.dataset.bool,nu=node.dataset.number,en=node.dataset.entity;const next={...this._config};
 if(k)next[k]=node.value;
 else if(bo)next[bo]=node.checked;
 else if(nu){next[nu]=nu==='idle_seconds'?clamp(Math.round(Number(node.value)||30),5,3600):nu==='image_focus'?clamp(Number(node.value),0,100):clamp(Number(node.value)||.48,.2,.9);if(nu==='glass_opacity')this.shadowRoot.querySelector('[data-opacity-text]').textContent=Math.round(next[nu]*100)+' %';if(nu==='image_focus')this.shadowRoot.querySelector('[data-focus-text]').textContent=Math.round(next[nu])+' %';}
 else if(en){next.entities={...(next.entities||{})};const val=node.value.trim();if(!val)delete next.entities[en];else if(en==='lights')next.entities.lights=val.split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean);else next.entities[en]=val;}
 this._config=next;this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:next},bubbles:true,composed:true}));
 }
}
if(!customElements.get('ha-seasons-universal-editor'))customElements.define('ha-seasons-universal-editor',HASeasonsUniversalEditor);

if(!customElements.get('ha-seasons-universal-card'))customElements.define('ha-seasons-universal-card',HASeasonsUniversalCard);
window.customCards=window.customCards||[];if(!window.customCards.some(x=>x.type==='ha-seasons-universal-card'))window.customCards.push({type:'ha-seasons-universal-card',name:'HA Seasons Universal',description:'Celoplošný šetrič podľa ročného obdobia a počasia bez zmeny dashboardu'});