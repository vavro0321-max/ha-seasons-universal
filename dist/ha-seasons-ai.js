/* HA Seasons AI V1.3.0 — weather, camera guard, idle screensaver and Slovak holidays. */
import {readWeather} from './weather-engine.mjs';
import { cameraBlockReason, isCameraRoute } from './camera-guard.mjs';
import {holidayForDate} from './holiday-engine.mjs';
const VERSION = '1.3.0';
const CLOUD_SOFT = new URL('./assets/clouds-soft.svg', import.meta.url).href;
const CLOUD_HEAVY = new URL('./assets/clouds-heavy.svg', import.meta.url).href;
const RAIN_ASSET = new URL('./assets/rain.svg', import.meta.url).href;
const ADVENT_PICTURES = [null,1,2,3,4].map(n=>n?new URL('./assets/advent-candles-'+n+'.webp',import.meta.url).href:null);
const DEFAULT_IMAGE = new URL('./background-default.jpg', import.meta.url).href;
const DEFAULT_SEASON_IMAGES = {
  spring:new URL('./seasons/spring.webp', import.meta.url).href,
  summer:new URL('./seasons/summer.webp', import.meta.url).href,
  autumn:new URL('./seasons/autumn.webp', import.meta.url).href,
  winter:new URL('./seasons/winter.webp', import.meta.url).href
};
const DEFAULT_DRY_WINTER_IMAGE = new URL('./seasons/winter-dry.jpg', import.meta.url).href;
const DEFAULT_SNOW_ENTITY='input_number.ha_seasons_snow_cover';
const DEFAULT_WEATHER_CANDIDATES=['weather.home','weather.forecast_cierne_11'];
function validEntityNumber(e){if(!e||!validText(e.state))return null;const n=Number(e.state);return Number.isFinite(n)?n:null;}
function pickWeatherEntity(hass, configured){const ids=configured?[configured,...DEFAULT_WEATHER_CANDIDATES]:DEFAULT_WEATHER_CANDIDATES;return ids.map(id=>state(hass,id)).find(e=>e&&validText(e.state))||Object.entries(hass?.states||{}).find(([id,e])=>id.startsWith('weather.')&&validText(e.state))?.[1]||null;}

const SEASONS=['spring','summer','autumn','winter'];
function seasonForDate(now=new Date(),timeZone='Europe/Bratislava'){
  let month;
  try{month=Number(new Intl.DateTimeFormat('en-GB',{timeZone,month:'numeric'}).format(now));}
  catch{month=now.getMonth()+1;}
  return month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter';
}
function imageForSeason(config, now=new Date(),hass){
  if(config.background_mode==='single')return String(config.background_image||DEFAULT_IMAGE);
  const forced=String(config.preview_season||'auto');
  const season=SEASONS.includes(forced)?forced:seasonForDate(now,hass?.config?.time_zone||'Europe/Bratislava');
  return String(config.seasonal_images?.[season]||DEFAULT_SEASON_IMAGES[season]);
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const validText = value => value !== null && value !== undefined && !['', 'unknown', 'unavailable', 'none'].includes(String(value).trim().toLowerCase());
const state = (hass, id) => id ? hass?.states?.[id] : undefined;
const fixed = (val, fallback) => Number.isFinite(Number(val)) ? Number(val) : fallback;
function localDate(now, hass) {
  const timezone = hass?.config?.time_zone || 'Europe/Bratislava';
  try { return {
    time: new Intl.DateTimeFormat('sk-SK', {hour:'2-digit', minute:'2-digit', timeZone:timezone}).format(now),
    date: new Intl.DateTimeFormat('sk-SK', {weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:timezone}).format(now)
  }; } catch { return {
    time: new Intl.DateTimeFormat('sk-SK',{hour:'2-digit',minute:'2-digit'}).format(now),
    date: new Intl.DateTimeFormat('sk-SK',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now)
  }; }
}
function readings(hass, config) {
  const ids = config.entities || {};
  const tempId = ids.temperature || 'sensor.ws2900_v2_02_01_outdoor_temperature';
  const temperatureEntity = state(hass,tempId);
  let temp = validText(temperatureEntity?.state) ? Number(temperatureEntity.state) : NaN;
  if (Number.isFinite(temp) && ['°f','f'].includes(String(temperatureEntity?.attributes?.unit_of_measurement||'').toLowerCase()))
    temp = (temp-32)*5/9;
  if (!Number.isFinite(temp)) {
    const weather = pickWeatherEntity(hass,ids.weather||config.weather_entity);
    temp = validText(weather?.attributes?.temperature) ? Number(weather.attributes.temperature) : NaN;
    if (Number.isFinite(temp) && ['°f','f'].includes(String(weather?.attributes?.temperature_unit||'').toLowerCase()))
      temp = (temp-32)*5/9;
  }
  const heat = state(hass, ids.heating || 'switch.thermostat_switch');
  let heating = validText(heat?.state) && ['on','off'].includes(heat.state) ?
    (heat.state === 'on' ? 'Kúri' : 'Nekúri') : '—';
  if (heating === '—') {
    const climate = Object.entries(hass?.states||{}).filter(([id])=>id.startsWith('climate.'));
    if (climate.length) heating = climate.some(([,e])=>e.attributes?.hvac_action==='heating') ? 'Kúri' : 'Nekúri';
  }
  const nameday = state(hass,ids.nameday||'sensor.meniny_dnes')?.state;
  const lightIds = Array.isArray(ids.lights) && ids.lights.length ? ids.lights :
    Object.keys(hass?.states||{}).filter(id=>id.startsWith('light.'));
  const available = lightIds.filter(id=>['on','off'].includes(state(hass,id)?.state));
  const enabled = available.filter(id=>state(hass,id)?.state==='on');
  return {
    temperature: Number.isFinite(temp) ? temp.toFixed(1).replace('.',',')+' °C' : '—',
    heating,
    nameday: validText(nameday) ? String(nameday) : '—',
    lighting: available.length ? `${enabled.length} zapnuté / ${available.length}` : '—'
  };
}
const CARD_STYLE = `
:host{display:block;min-height:1px;height:1px;overflow:hidden;pointer-events:none}
`;
const SCREEN_STYLE = `
:host{all:initial;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;position:fixed;inset:0;z-index:2147483000;pointer-events:auto}
.screen{position:fixed;inset:0;width:100vw;width:100dvw;height:100vh;height:100dvh;background:#14202b;overflow:hidden;isolation:isolate;user-select:none;touch-action:manipulation}
.background{position:absolute;inset:0;background-size:cover;background-position:center center;background-repeat:no-repeat;z-index:-3}.background-next{z-index:-2;opacity:0;transition:opacity 1.5s ease}.background-next.no-transition{transition:none}.falling-snow{position:absolute;inset:-30% 0 0;z-index:0;pointer-events:none;opacity:0;
 background-image:radial-gradient(2px 2px at 12% 24%,#fff 98%,transparent),radial-gradient(3px 3px at 45% 52%,#fff 98%,transparent),radial-gradient(2px 2px at 74% 13%,#fff 98%,transparent),radial-gradient(2px 2px at 91% 82%,#fff 98%,transparent);
 background-size:190px 220px;animation:falling-snow 11s linear infinite;transition:opacity 2s}
@keyframes falling-snow{from{background-position:0 -220px}to{background-position:70px 220px}}
@media(prefers-reduced-motion:reduce){.falling-snow{animation:none}}
.snow-background{position:absolute;inset:0;background-size:cover;background-position:center center;background-repeat:no-repeat;z-index:-1;opacity:0;transition:opacity 5s linear;pointer-events:none}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,13,24,.23),rgba(4,13,24,.02) 54%,transparent);z-index:0;pointer-events:none}
.content{position:absolute;top:max(env(safe-area-inset-top,0px),4.8vh);left:50%;transform:translateX(-50%);width:min(94vw,1300px);display:flex;flex-direction:column;align-items:center;text-align:center;text-shadow:0 2px 15px #041021ba}
.clock{font-size:clamp(56px,12vh,130px);line-height:1.01;letter-spacing:-.045em;font-weight:760;font-variant-numeric:tabular-nums}
.date{font-size:clamp(14px,2.6vh,24px);margin-top:8px;font-weight:450}
.cards{width:100%;margin-top:clamp(20px,5vh,54px);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(8px,1.2vw,16px)}
.info{display:flex;min-width:0;align-items:center;justify-content:center;flex-direction:column;gap:5px;background:rgba(9,24,43,.48);border:1px solid rgba(220,235,253,.36);border-radius:18px;min-height:clamp(92px,15vh,155px);padding:10px 7px;box-sizing:border-box;backdrop-filter:blur(7px);box-shadow:0 6px 20px #0004}
.info .emoji{font-size:clamp(21px,3.8vh,34px)}.info .label{font-size:clamp(10px,1.45vw,15px);letter-spacing:.07em;text-transform:uppercase;color:#e3ebf5}
.info .value{font-size:clamp(17px,2.25vw,28px);font-weight:730;line-height:1.14;overflow-wrap:anywhere;max-width:100%}
@media (orientation:portrait){.content{top:max(env(safe-area-inset-top,0px),6vh);width:92vw}.cards{grid-template-columns:repeat(2,minmax(0,1fr));max-width:680px;margin-top:4vh}.info{min-height:clamp(88px,12vh,130px)}.info .value{font-size:clamp(15px,3.8vw,25px)}}
@media (max-height:560px) and (orientation:landscape){.content{top:2vh}.clock{font-size:clamp(42px,15vh,82px)}.date{font-size:14px;margin-top:2px}.cards{margin-top:14px}.info{min-height:75px;padding:6px 4px;gap:2px;border-radius:13px}.info .emoji{font-size:17px}.info .label{font-size:11px}.info .value{font-size:clamp(13px,2.2vw,18px)}}
@media (max-width:360px) and (orientation:portrait){.content{top:4vh}.clock{font-size:56px}.cards{gap:8px;margin-top:18px}.info{min-height:88px}}
`;

const ATMOSPHERE_STYLE = `
.background{z-index:0}.background-next{z-index:1}.snow-background{z-index:2}
.atmosphere-night{position:absolute;inset:0;z-index:3;pointer-events:none;background:linear-gradient(180deg,#051427 0%,#0b1a39 46%,#06101c 100%);opacity:0;mix-blend-mode:multiply;transition:opacity 15s ease}
.atmosphere-twilight{position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(180deg,rgba(237,125,69,.18) 0%,rgba(244,143,66,.03) 60%,transparent 85%);opacity:0;transition:opacity 15s ease}
.weather-sky{position:absolute;top:0;left:0;width:100%;height:53%;z-index:5;pointer-events:none;overflow:hidden;mask-image:linear-gradient(to bottom,black 0%,black 61%,transparent 100%);-webkit-mask-image:linear-gradient(to bottom,black 0%,black 61%,transparent 100%)}
.weather-sky .clouds{position:absolute;inset:-12% -30%;background-size:85% auto;background-position:center;background-repeat:repeat-x;opacity:0;filter:brightness(.87);transition:opacity 12s ease,filter 12s ease;will-change:opacity}
.weather-sky .clouds.cloud-back{animation:weather-drift 115s linear infinite alternate}
.weather-sky .clouds.cloud-front{animation:weather-drift-rev 170s linear infinite alternate}
.weather-sky .celestial{position:absolute;width:66px;height:66px;transform:translate(-50%,-50%);transition:opacity 10s ease,left 20s linear,top 20s linear;opacity:0}
.weather-sky .celestial.sun{border-radius:50%;width:44px;height:44px;background:radial-gradient(circle at 45% 43%,#fffaf2 4%,#ffe39d 60%,#ffc85b 82%,#efad3f 100%);box-shadow:0 0 32px 17px #ffe4a85c,0 0 100px 45px #ffd98540;z-index:2}
.weather-sky .celestial.moon{font-size:39px;line-height:1;text-align:center;filter:drop-shadow(0 0 17px #c0daf0);z-index:2;display:flex;align-items:center;justify-content:center}
.weather-fog{position:absolute;inset:0;z-index:6;pointer-events:none;background:linear-gradient(180deg,#d8e4ec33,#d8e4ec55 35%,#e5f3f558 63%,transparent 90%);opacity:0;transition:opacity 14s ease}
.weather-rain{position:absolute;inset:0;z-index:7;pointer-events:none;background-repeat:repeat;background-size:480px 480px;opacity:0;animation:weather-rain 1.25s linear infinite;transition:opacity 8s ease}
.falling-snow{z-index:7;transition:opacity 8s ease}
.shade{z-index:8}.content{z-index:9;pointer-events:none}
@keyframes weather-drift{from{transform:translateX(-6%)}to{transform:translateX(6%)}}
@keyframes weather-drift-rev{from{transform:translateX(5%)}to{transform:translateX(-8%)}}
@keyframes weather-rain{from{background-position:0 -480px}to{background-position:105px 480px}}
@media(prefers-reduced-motion:reduce){.weather-sky .clouds,.weather-rain{animation:none}}
`;

const HOLIDAY_STYLE = `
.holiday-scene{position:absolute;inset:0;z-index:8;pointer-events:none;overflow:hidden;opacity:0;transition:opacity 4s ease}
.advent-photograph{position:absolute;inset:0;z-index:2;pointer-events:none;background-position:center center;background-size:cover;background-repeat:no-repeat;opacity:0;transition:opacity 8s ease;will-change:opacity}
.holiday-scene.active{opacity:1}
.holiday-lights{position:absolute;inset:0 0 auto;height:8vh;min-height:34px;max-height:88px;opacity:0;
 background-image:radial-gradient(circle at 18px 23px,#fce6a8 0 3px,transparent 6px),radial-gradient(circle at 56px 35px,#ffc785 0 3px,transparent 6px),radial-gradient(circle at 104px 17px,#ebf5ff 0 3px,transparent 6px),radial-gradient(circle at 141px 29px,#ffe7a7 0 3px,transparent 6px);
 background-size:175px 70px;background-repeat:repeat-x;filter:drop-shadow(0 0 8px #f7bd68);animation:holiday-twinkle 6s ease-in-out infinite alternate}
.holiday-glow{position:absolute;width:min(140px,13vw);height:min(140px,13vw);min-width:45px;min-height:45px;opacity:0;transform:translate(-50%,-50%);background:radial-gradient(circle,#ffe2a56b 0%,#f8b66a30 38%,transparent 68%);filter:blur(10px);mix-blend-mode:screen;transition:opacity 8s ease}
.holiday-petals{position:absolute;inset:0;opacity:0;background:radial-gradient(circle at 12% 8%,#fff8dbaa 0 6px,transparent 9px),radial-gradient(circle at 34% 2%,#ffb3c8aa 0 6px,transparent 9px),radial-gradient(circle at 77% 10%,#e8f9c599 0 5px,transparent 8px),radial-gradient(circle at 92% 3%,#ffbbd2bb 0 6px,transparent 9px);background-size:240px 160px;mask-image:linear-gradient(to bottom,#000 0%,transparent 28%);-webkit-mask-image:linear-gradient(to bottom,#000 0%,transparent 28%)}
.holiday-stars{position:absolute;inset:0;opacity:0;background-image:radial-gradient(3px 3px at 18% 12%,#fff1ba,transparent),radial-gradient(3px 3px at 86% 10%,#fff1ba,transparent),radial-gradient(4px 4px at 69% 22%,#ffdea6,transparent),radial-gradient(3px 3px at 28% 30%,#ffdfa6,transparent);background-size:310px 240px;mask-image:linear-gradient(to bottom,black,transparent 42%);-webkit-mask-image:linear-gradient(to bottom,black,transparent 42%);animation:holiday-twinkle 8s ease-in-out infinite alternate}
.holiday-caption{position:absolute;top:max(10px,env(safe-area-inset-top,0px));right:max(10px,env(safe-area-inset-right,0px));
 max-width:44vw;font-size:clamp(11px,1.1vw,14px);letter-spacing:.025em;font-weight:600;padding:7px 12px;border-radius:20px;
 color:#fff9e6;background:#18243787;border:1px solid #fff4cd6b;text-shadow:0 1px 5px #0009;backdrop-filter:blur(5px);white-space:normal;z-index:10;opacity:0;transition:opacity 1s}
.holiday-caption.visible{opacity:1}
.holiday-scene[data-theme="christmas"] .holiday-lights,.holiday-scene[data-theme="advent"] .holiday-lights{opacity:.9}
.holiday-scene[data-theme="christmas"] .holiday-glow,.holiday-scene[data-theme="advent"] .holiday-glow{opacity:.9}
.holiday-scene[data-theme="newyear"] .holiday-stars,.holiday-scene[data-theme="national"] .holiday-stars{opacity:.75}
.holiday-scene[data-theme="easter"] .holiday-petals,.holiday-scene[data-theme="spring"] .holiday-petals{opacity:.8}
.holiday-candles{position:absolute;top:12px;left:18px;display:flex;align-items:end;gap:8px;opacity:0;transition:opacity 2s ease}
.holiday-scene[data-theme="advent"] .holiday-candles{opacity:1}
.holiday-candles .candle{display:block;position:relative;width:10px;height:25px;border-radius:3px;background:linear-gradient(90deg,#6e3244,#ba6374,#7d4155);box-shadow:0 2px 3px #0005;border-top:2px solid #f2cfd6}
.holiday-candles .candle.lit::before{content:"";position:absolute;bottom:calc(100% + 4px);left:2px;width:6px;height:11px;background:#ffd77c;border-radius:65% 10% 60% 10%;transform:rotate(-7deg);box-shadow:0 0 9px 4px #ffca6e77}
@keyframes holiday-twinkle{0%{filter:brightness(.75)}100%{filter:brightness(1.2)}}
@media(prefers-reduced-motion:reduce){.holiday-lights,.holiday-stars{animation:none}}
@media(max-width:530px){.holiday-caption{font-size:11px;max-width:51vw;padding:5px 8px}.holiday-candles{top:8px;left:10px;gap:5px}.holiday-candles .candle{width:8px;height:20px}}
`;
const EDITOR_STYLE = `
:host{display:block;color:var(--primary-text-color,#eaf0f9);font-family:system-ui,sans-serif}
.wrap{padding:14px;border:1px solid var(--divider-color,#7c96b6);border-radius:14px;display:grid;gap:13px}
.field{display:grid;gap:5px;font-size:14px}.field input,.field select{padding:9px 10px;border:1px solid #899db7;border-radius:8px;background:var(--card-background-color,#24384e);color:var(--primary-text-color,#fff);width:100%;box-sizing:border-box}
.hint{font-size:12px;opacity:.85;line-height:1.45}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:480px){.row{grid-template-columns:1fr}}
`;
class HASeasonsFinal extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'}).innerHTML=`<style>${CARD_STYLE}</style><div aria-hidden="true"></div>`;
    this._config={};this._hass=null;this._visible=false;this._lastActive=Date.now();
    this._onActivity=this._onActivity.bind(this);this._tick=this._tick.bind(this);
    this._onVisibilityChange=()=>{this._lastActive=Date.now();};
    this._closeTimer=null;this._cameraWasBlocked=false;this._lastBlockReason='';this._bgTokenCounter=0;this._transitionTimer=null;this._wantedBackground=null;this._activeBackground=null;
  }
  static getStubConfig(){return {type:'custom:ha-seasons-ai-card',idle_seconds:30,background_mode:'seasonal'};}
  static getConfigElement(){return document.createElement('ha-seasons-ai-editor');}
  setConfig(config){this._config={idle_seconds:30,block_when_camera_open:true,camera_views:['kamery','kamera','cameras','camera'],background_mode:'seasonal',preview_season:'auto',background_fit:'cover',background_x:50,background_y:50,background_dim:0.14,holidays_enabled:true,show_holiday_label:true,holiday_animations:true,holiday_church_lights:true,photographic_advent:true,preview_holiday:'auto',dynamic_snow:true,snow_cover_entity:DEFAULT_SNOW_ENTITY,...(config||{})}; if(this._visible)this._render();}
  getCardSize(){return 1;}
  set hass(hass){this._hass=hass;if(this._visible)this._render();}
  connectedCallback(){if(this._timer)return;this._lastActive=Date.now();
    this._cameraWasBlocked=false;this._lastBlockReason='';
    for(const ev of ['pointerdown','pointermove','keydown','wheel','touchstart','scroll','focusin'])window.addEventListener(ev,this._onActivity,true);
    document.addEventListener('visibilitychange',this._onVisibilityChange);
    this._timer=setInterval(this._tick,1000);
  }
  disconnectedCallback(){if(this._timer)clearInterval(this._timer);this._timer=null;
    for(const ev of ['pointerdown','pointermove','keydown','wheel','touchstart','scroll','focusin'])window.removeEventListener(ev,this._onActivity,true);
    document.removeEventListener('visibilitychange',this._onVisibilityChange);
    this._close();}
  _onActivity(){if(!this._visible)this._lastActive=Date.now();}
  _editing(){return Boolean(document.querySelector('hui-root')?.editMode||window.location.search.includes('edit=1'));}
  _blockReason(){
    if(this._config.block_when_camera_open===false)return '';
    return cameraBlockReason(document,window.location,this._config);
  }
  _tick(){
    if(!this.isConnected)return;
    if(this._visible){this._render();return;}
    const now=Date.now();
    if(document.hidden||this._editing()||!this._hass){this._lastActive=now;return;}
    const reason=this._blockReason();
    if(reason){this._cameraWasBlocked=true;this._lastBlockReason=reason;this._lastActive=now;return;}
    if(this._cameraWasBlocked){
      // Camera popup/stream/view was just closed: start a FULL fresh idle interval.
      this._cameraWasBlocked=false;this._lastBlockReason='';this._lastActive=now;return;
    }
    const idle=clamp(fixed(this._config.idle_seconds,30),5,3600)*1000;
    if(now-this._lastActive>=idle)this._open();
  }
  showForDemo(){this._lastActive=Date.now();this._open(true);}
  _open(force=false){if(this._visible)return;
    if(!force&&(document.hidden||this._editing()||this._blockReason()))return;
    this._visible=true;
    const host=document.createElement('div');host.setAttribute('data-ha-seasons-final',VERSION);
    host.attachShadow({mode:'open'}).innerHTML=`<style>${SCREEN_STYLE}${ATMOSPHERE_STYLE}${HOLIDAY_STYLE}</style><div class="screen" role="dialog" aria-label="HA Seasons – šetrič obrazovky"><div class="background"></div><div class="background background-next"></div><div class="snow-background"></div><div class="advent-photograph" aria-hidden="true"></div><div class="atmosphere-night"></div><div class="atmosphere-twilight"></div><div class="weather-sky"><div class="celestial sun"></div><div class="celestial moon"></div><div class="clouds cloud-back"></div><div class="clouds cloud-front"></div></div><div class="weather-fog"></div><div class="weather-rain"></div><div class="falling-snow"></div><div class="shade"></div><div class="holiday-scene" aria-hidden="true"><div class="holiday-lights"></div><div class="holiday-stars"></div><div class="holiday-petals"></div><div class="holiday-glow"></div><div class="holiday-candles"><span class="candle"></span><span class="candle"></span><span class="candle"></span><span class="candle"></span></div></div><div class="holiday-caption" aria-hidden="true"></div><div class="content"><div class="clock"></div><div class="date"></div><div class="cards"><div class="info"><div class="emoji">🌡️</div><div class="label">Vonku</div><div class="value" data-field="temperature"></div></div><div class="info"><div class="emoji">♨️</div><div class="label">Kúrenie</div><div class="value" data-field="heating"></div></div><div class="info"><div class="emoji">🎁</div><div class="label">Meniny dnes</div><div class="value" data-field="nameday"></div></div><div class="info"><div class="emoji">💡</div><div class="label">Osvetlenie</div><div class="value" data-field="lighting"></div></div></div></div></div>`;
    this._host=host;this._root=host.shadowRoot;document.body.appendChild(host);
    this._screen=host.shadowRoot.querySelector('.screen');
    this._onDismiss=e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();
      if(this._closeTimer!==null)return;
      // Wait until the rest of the tap/click gesture finishes to prevent click-through.
      this._closeTimer=setTimeout(()=>{this._closeTimer=null;this._close();},320);
    };
    for(const ev of ['pointerdown','touchstart','click'])this._screen.addEventListener(ev,this._onDismiss,{capture:true});
    this._render();
  }
  _loadBackground(src){
    this._wantedBackground=src;
    const token=++this._bgTokenCounter;
    const picture=new Image();
    picture.onload=()=>{
      if(token!==this._bgTokenCounter||!this._root)return;
      const current=this._root.querySelector('.background'),next=this._root.querySelector('.background-next');
      const css=`url(${JSON.stringify(src)})`;
      if(!this._activeBackground){current.style.backgroundImage=css;this._activeBackground=src;return;}
      if(src===this._activeBackground)return;
      clearTimeout(this._transitionTimer);
      next.classList.add('no-transition');next.style.opacity='0';next.style.backgroundImage=css;
      void next.offsetHeight;
      next.classList.remove('no-transition');next.style.opacity='1';
      this._transitionTimer=setTimeout(()=>{
        if(!this._root||token!==this._bgTokenCounter)return;
        current.style.backgroundImage=css;this._activeBackground=src;
        next.classList.add('no-transition');next.style.opacity='0';next.style.backgroundImage='none';
      },1550);
    };
    picture.onerror=()=>{
      if(token!==this._bgTokenCounter)return;
      const fallback=String(this._config.background_image||DEFAULT_IMAGE);
      if(src!==fallback)this._loadBackground(fallback);
      else if(src!==DEFAULT_IMAGE)this._loadBackground(DEFAULT_IMAGE);
    };
    picture.src=src;
  }
  _close(){clearTimeout(this._transitionTimer);this._transitionTimer=null;
    this._bgTokenCounter++;this._activeBackground=null;this._wantedBackground=null;
    if(this._closeTimer!==null){clearTimeout(this._closeTimer);this._closeTimer=null;}
    this._host?.remove();this._host=null;this._root=null;this._screen=null;this._visible=false;this._lastActive=Date.now();}

  _renderHoliday(now){
    if(!this._root)return;
    const fx=this._root.querySelector('.holiday-scene');
    const caption=this._root.querySelector('.holiday-caption');
    if(!fx||!caption)return;
    const holiday=holidayForDate(now,this._hass?.config?.time_zone||'Europe/Bratislava',this._config);
    const active=holiday.type!=='none';
    fx.classList.toggle('active',active);
    fx.dataset.theme=active?holiday.type:'none';
    caption.classList.toggle('visible',active&&this._config.show_holiday_label!==false);
    caption.textContent=active?`${holiday.emoji} ${holiday.label}`:'';
    // Festive LIGHTS (unlike labels/flowers) appear only from dusk to dawn.
    const sunEntity=state(this._hass,'sun.sun');
    const elevation=Number(sunEntity?.attributes?.elevation);
    const darkness=Number.isFinite(elevation)&&sunEntity?.attributes?.elevation!==null&&sunEntity?.attributes?.elevation!==undefined
      ?clamp((4-elevation)/16,0,1)
      :sunEntity?.state==='below_horizon'?1:0;
    const festiveLight=['christmas','advent'].includes(holiday.type);
    fx.querySelector('.holiday-lights').style.opacity=active&&festiveLight?String(.9*darkness):'0';
    fx.querySelector('.holiday-stars').style.opacity=active&&['newyear','national'].includes(holiday.type)?String(.75*darkness):'0';
    const low=this._config.low_motion===true||this._config.holiday_animations===false;
    for(const node of fx.querySelectorAll('.holiday-lights,.holiday-stars'))node.style.animationPlayState=low?'paused':'running';
    [...fx.querySelectorAll('.candle')].forEach((c,i)=>c.classList.toggle('lit',i<holiday.candles));
    const church=fx.querySelector('.holiday-glow');
    // Church position is known only for bundled 1536x864 photographs. Never
    // paint a glow on an arbitrary user's image unless they specify placement.
    const custom=Boolean(this._config.background_mode==='single'||this._config.background_image||
      this._config.snow_free_image||Object.values(this._config.seasonal_images||{}).some(Boolean));
    // Bundled landscape: use the 1–4-candle photorealistic variants ONLY at dusk/night.
    // Custom photos must never be replaced by an unrelated house/landscape.
    const photo=this._root.querySelector('.advent-photograph');
    const currentStage=['advent','christmas'].includes(holiday.type)?holiday.candles:0;
    const photoAllowed=this._config.photographic_advent!==false&&!custom&&currentStage>0;
    if(photo){
      const file=photoAllowed?ADVENT_PICTURES[currentStage]:null;
      if(file&&photo.dataset.source!==file){photo.style.backgroundImage=`url(${JSON.stringify(file)})`;photo.dataset.source=file;}
      photo.style.backgroundSize=this._config.background_fit==='contain'?'contain':'cover';
      photo.style.backgroundPosition=`${clamp(fixed(this._config.background_x,50),0,100)}% ${clamp(fixed(this._config.background_y,50),0,100)}%`;
      photo.style.opacity=photoAllowed?String(darkness):'0';
    }
    // Never display duplicate CSS candles over the photographic wreath.
    fx.querySelector('.holiday-candles').style.visibility=photoAllowed&&darkness>.4?'hidden':'visible';
    const placed=active&&['christmas','advent'].includes(holiday.type)&&
      this._config.holiday_church_lights!==false&&!custom;
    church.style.display=placed&&!photoAllowed?'block':'none';
    church.style.opacity=placed?String(.9*darkness):'0';
    if(placed&&this._screen){
      const w=this._screen.clientWidth,h=this._screen.clientHeight;
      const s=Math.max(w/1536,h/864),ww=1536*s,hh=864*s;
      const ox=(w-ww)*clamp(fixed(this._config.background_x,50),0,100)/100;
      const oy=(h-hh)*clamp(fixed(this._config.background_y,50),0,100)/100;
      const cx=ox+1268*s,cy=oy+456*s;
      if(cx<-40||cx>w+40||cy<-40||cy>h+40)church.style.display='none';
      else{church.style.left=`${cx}px`;church.style.top=`${cy}px`;}
    }
  }
  _render(){if(!this._root)return;
    const nowLive=new Date();
    // In preview only, display the selected test date rather than today's date.
    let dateSource=nowLive;
    const preview=String(this._config.preview_date||'');
    if(/^\d{4}-\d{2}-\d{2}$/.test(preview)){
      const [y,m,d]=preview.split('-').map(Number);
      const dt=new Date(Date.UTC(y,m-1,d,12));
      if(dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d)dateSource=dt;
    }
    const {time}=localDate(nowLive,this._hass);
    const {date}=localDate(dateSource,this._hass);
    this._root.querySelector('.clock').textContent=time;
    this._root.querySelector('.date').textContent=date;
    this._renderHoliday(new Date());
    const now=new Date();
    const season=SEASONS.includes(this._config.preview_season)?this._config.preview_season:seasonForDate(now,this._hass?.config?.time_zone||'Europe/Bratislava');
    const dynamic=this._config.dynamic_snow!==false&&this._config.background_mode!=='single';
    const coverEntity=state(this._hass,this._config.snow_cover_entity||DEFAULT_SNOW_ENTITY);
    const coverReading=validEntityNumber(coverEntity);
    const cover=coverReading===null?0:clamp(coverReading,0,100);
    const image=dynamic&&season==='winter'
      ?String(this._config.snow_free_image||this._config.seasonal_images?.winter_dry||DEFAULT_DRY_WINTER_IMAGE)
      :imageForSeason(this._config,now,this._hass);
    const bg=this._root.querySelector('.background');
    const next=this._root.querySelector('.background-next');
    for(const layer of [bg,next,this._root.querySelector('.snow-background')]){
      layer.style.backgroundSize=this._config.background_fit==='contain'?'contain':'cover';
      layer.style.backgroundPosition=`${clamp(fixed(this._config.background_x,50),0,100)}% ${clamp(fixed(this._config.background_y,50),0,100)}%`;
    }
    if(image!==this._wantedBackground)this._loadBackground(image);
    const snowLayer=this._root.querySelector('.snow-background');
    const weatherEntity=pickWeatherEntity(this._hass,this._config.weather_entity||this._config.entities?.weather);
    const weatherState=String(weatherEntity?.state||'');
    const temperatureEntity=state(this._hass,this._config.entities?.temperature||'sensor.ws2900_v2_02_01_outdoor_temperature');
    let temperature=validEntityNumber(temperatureEntity);
    if(temperature!==null&&['°f','f'].includes(String(temperatureEntity?.attributes?.unit_of_measurement||'').toLowerCase()))temperature=(temperature-32)*5/9;
    const snowingNow=dynamic&&['snowy','snowy-rainy'].includes(weatherState)&&temperature!==null&&temperature<=1;
    const wx=readWeather(this._hass||{states:{}},this._config,now);
    const sky=this._root.querySelector('.weather-sky');
    const clouds=sky.querySelectorAll('.clouds');
    const cloudEnabled=this._config.show_clouds!==false && this._config.dynamic_weather!==false;
    const motion=this._config.cloud_motion!==false && this._config.low_motion!==true;
    sky.style.height=`${clamp(fixed(this._config.sky_height,53),16,70)}%`;
    clouds[0].style.backgroundImage=`url(${JSON.stringify(CLOUD_SOFT)})`;
    clouds[1].style.backgroundImage=`url(${JSON.stringify(CLOUD_HEAVY)})`;
    clouds[0].style.opacity=cloudEnabled?String(clamp(wx.cloud*0.55,0,.6)):'0';
    clouds[1].style.opacity=cloudEnabled?String(clamp(Math.pow(wx.cloud,1.3)*0.78,0,.78)):'0';
    clouds.forEach(c=>{c.style.animationPlayState=motion?'running':'paused';c.style.filter=`brightness(${clamp(1-wx.cloudDark*.48,.5,1)})`;});
    const dynamicWeather=this._config.dynamic_weather!==false;
    const sun=sky.querySelector('.sun'),moon=sky.querySelector('.moon');
    sun.style.left=`${wx.sunX}%`;sun.style.top=`${wx.sunY}%`;
    sun.style.opacity=dynamicWeather&&this._config.show_sun!==false?String(wx.sunOpacity):'0';
    moon.style.left='78%';moon.style.top='28%';moon.textContent=wx.moonPhase.icon;
    moon.style.opacity=dynamicWeather&&this._config.show_moon!==false?String(wx.moonOpacity):'0';
    this._root.querySelector('.atmosphere-night').style.opacity=dynamicWeather?String(wx.night*.86):'0';
    this._root.querySelector('.atmosphere-twilight').style.opacity=dynamicWeather?String(wx.twilight*.9):'0';
    this._root.querySelector('.weather-fog').style.opacity=dynamicWeather&&this._config.show_fog!==false?String(wx.fog*.65):'0';
    const rainLayer=this._root.querySelector('.weather-rain');
    rainLayer.style.backgroundImage=`url(${JSON.stringify(RAIN_ASSET)})`;
    rainLayer.style.opacity=dynamicWeather&&this._config.show_precipitation!==false&&wx.precipitation==='rain'?String(wx.intensity*.87):'0';
    rainLayer.style.animationPlayState=this._config.low_motion===true?'paused':'running';
    this._root.querySelector('.falling-snow').style.opacity=dynamicWeather&&this._config.show_precipitation!==false&&snowingNow?'0.72':'0';
    this._root.querySelector('.falling-snow').style.animationPlayState=this._config.low_motion===true?'paused':'running';
    // Preserve user-selected images and let the visual snow respond to persisted HA helper.
    // For the winter image at 100%, don't double-overlay a full winter image.
    const winterSrc=String(this._config.snow_image||this._config.seasonal_images?.winter||DEFAULT_SEASON_IMAGES.winter);
    if(dynamic&&cover>0){
      const safeUrl=JSON.stringify(winterSrc);if(snowLayer.dataset.current!==winterSrc){snowLayer.style.backgroundImage=`url(${safeUrl})`;snowLayer.dataset.current=winterSrc;}
      snowLayer.style.opacity=String(cover/100);
    }else snowLayer.style.opacity='0';

    this._root.querySelector('.shade').style.background=`rgba(0,8,19,${clamp(fixed(this._config.background_dim,0.14),0,0.8)})`;
    const values=readings(this._hass||{states:{}},this._config);
    for(const [field,value]of Object.entries(values))this._root.querySelector(`[data-field="${field}"]`).textContent=value;
  }
}
class HASeasonsFinalEditor extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});this._config={};}
  setConfig(config){this._config={...(config||{})};this._render();}
  set hass(value){this._hass=value;}
  _render(){const c=this._config;
    const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const fields=['spring','summer','autumn','winter'].map(season=>{
      const label={spring:'🌸 Jar',summer:'☀️ Leto',autumn:'🍂 Jeseň',winter:'❄️ Zima'}[season];
      return `<label class="field">${label} – /local/...<input data-season="${season}" value="${esc(c.seasonal_images?.[season]||'')}" placeholder="Predvolená AI fotografia"></label>`;
    }).join('');
    const field=(label,key,placeholder='')=>`<label class="field">${label}<input data-key="${key}" value="${esc(c.entities?.[key]||'')}" placeholder="${placeholder}"></label>`;
    this.shadowRoot.innerHTML=`<style>${EDITOR_STYLE}</style><div class="wrap"><strong>HA Seasons AI V1.2 — sviatky + počasie + automatický šetrič</strong>
      <label class="field">Režim pozadia<select data-prop="background_mode"><option value="seasonal" ${c.background_mode!=='single'?'selected':''}>Automatické ročné obdobia</option><option value="single" ${c.background_mode==='single'?'selected':''}>Jeden obrázok celý rok</option></select></label>
      <label class="field">Vlastný obrázok / núdzové pozadie<input data-prop="background_image" value="${esc(c.background_image||'')}" placeholder="/local/moja-fotografia.jpg"></label>
      <label class="field">Test ročného obdobia<select data-prop="preview_season"><option value="auto" ${!c.preview_season||c.preview_season==='auto'?'selected':''}>Automaticky podľa dátumu</option>${['spring','summer','autumn','winter'].map(x=>`<option value="${x}" ${c.preview_season===x?'selected':''}>${{spring:'Jar',summer:'Leto',autumn:'Jeseň',winter:'Zima'}[x]}</option>`).join('')}</select></label>
      <p class="hint">Pri automatickom režime sa používajú hotové sezónne fotografie. Vlastné AI verzie vytvorí samostatný generátor na PC a skopírujú sa do <code>/config/www/</code>. Kľúč AI nikdy nepatrí do tejto karty.</p>
      <strong>🎄 Sviatky a sezónne dekorácie</strong>
      <label class="field">Sviatočné efekty<select data-bool="holidays_enabled"><option value="true" ${c.holidays_enabled!==false?'selected':''}>Zapnuté</option><option value="false" ${c.holidays_enabled===false?'selected':''}>Vypnuté</option></select></label>
      <label class="field">Nenápadný názov sviatku<select data-bool="show_holiday_label"><option value="true" ${c.show_holiday_label!==false?'selected':''}>Zobraziť v hornom rohu</option><option value="false" ${c.show_holiday_label===false?'selected':''}>Skryť</option></select></label>
      <label class="field">Fotografický adventný veniec na našej krajine<select data-bool="photographic_advent"><option value="true" ${c.photographic_advent!==false?'selected':''}>Zapnutý</option><option value="false" ${c.photographic_advent===false?'selected':''}>Vypnutý</option></select></label>
      <label class="field">Animované sviatočné svetielka<select data-bool="holiday_animations"><option value="true" ${c.holiday_animations!==false?'selected':''}>Zapnuté</option><option value="false" ${c.holiday_animations===false?'selected':''}>Vypnuté</option></select></label>
      <label class="field">Zvýrazniť kostolík na predvolenej fotografii<select data-bool="holiday_church_lights"><option value="true" ${c.holiday_church_lights!==false?'selected':''}>Áno</option><option value="false" ${c.holiday_church_lights===false?'selected':''}>Nie</option></select></label>
      <label class="field">Testovať konkrétny sviatok<select data-prop="preview_holiday"><option value="auto" ${!c.preview_holiday||c.preview_holiday==='auto'?'selected':''}>Automaticky podľa dátumu</option><option value="none" ${c.preview_holiday==='none'?'selected':''}>Bez sviatku</option>${['advent','christmas','newyear','easter','spring','remembrance','national'].map(x=>`<option value="${x}" ${c.preview_holiday===x?'selected':''}>${({advent:'Advent',christmas:'Vianoce',newyear:'Nový rok',easter:'Veľká noc',spring:'Jar / máj',remembrance:'Sviatok všetkých svätých',national:'Pamätný deň'})[x]}</option>`).join('')}</select></label>
      <label class="field">Testovací dátum (RRRR-MM-DD, prázdny = dnes)<input data-prop="preview_date" value="${esc(c.preview_date||'')}" placeholder="2026-12-24"></label>
      <p class="hint">Sviatky sa určujú podľa časového pásma Home Assistanta. Veľká noc sa počíta každý rok; vianočná výzdoba začína 16. decembra, bez Santu. Vlastná fotografia dostane jemnú sviatočnú výzdobu, no efekt osvetlenia kostolíka sa používa len na našich predvolených podkladoch.</p>
      <strong>Dynamické počasie (oblaky, dážď, slnko, mesiac)</strong>
      ${['dynamic_weather','show_clouds','show_precipitation','show_sun','show_moon','show_fog','cloud_motion','low_motion'].map(k=>`<label class="field">${({dynamic_weather:'Aktivovať dynamické počasie',show_clouds:'Oblaky',show_precipitation:'Dážď a snehové vločky',show_sun:'Slnko (obrázok už môže obsahovať slnko)',show_moon:'Mesiac',show_fog:'Hmla',cloud_motion:'Jemný pohyb oblakov',low_motion:'Úsporný režim bez pohybu'})[k]}<select data-bool="${k}"><option value="true" ${(k==='low_motion'?c[k]===true:c[k]!==false)?'selected':''}>Zapnuté</option><option value="false" ${(k==='low_motion'?c[k]!==true:c[k]===false)?'selected':''}>Vypnuté</option></select></label>`).join('')}
      <label class="field">Výška oblasti oblohy (%)<input data-num="sky_height" type="range" min="16" max="70" value="${clamp(fixed(c.sky_height,53),16,70)}"></label>
      <label class="field">Senzor zrážok (mm/h)<input data-prop="rain_rate_entity" value="${esc(c.rain_rate_entity||'sensor.ws2900_v2_02_01_rain_rate')}"></label>
      <label class="field">Senzor fázy Mesiaca<input data-prop="moon_entity" value="${esc(c.moon_entity||'sensor.moon_phase')}"></label>
      <p class="hint">Slnko sa riadi sun.sun (výška/azimut) a mesiac sa zobrazuje v noci podľa dostupnej fázy. Poloha mesiaca je iba dekoratívna; presnú polohu na oblohe nepočítame. Obloha a sneh sú vizuálne aproximácie fotografií.</p>
      <strong>Dynamický sneh (HA Green)</strong>
      <label class="field">Dynamický sneh<select data-bool="dynamic_snow"><option value="true" ${c.dynamic_snow!==false?'selected':''}>Zapnutý</option><option value="false" ${c.dynamic_snow===false?'selected':''}>Vypnutý</option></select></label>
      <label class="field">Entita počasia<input data-prop="weather_entity" value="${esc(c.weather_entity||'weather.home')}"></label>
      <label class="field">Entita pokrytia snehom (0–100)<input data-prop="snow_cover_entity" value="${esc(c.snow_cover_entity||DEFAULT_SNOW_ENTITY)}"></label>
      <label class="field">Voliteľná zima bez snehu<input data-prop="snow_free_image" value="${esc(c.snow_free_image||'')}" placeholder="/local/ha-seasons-ai/winter-dry.webp"></label>
      <label class="field">Voliteľný zasnežený obrázok<input data-prop="snow_image" value="${esc(c.snow_image||'')}" placeholder="Použije zimnú AI fotografiu"></label>
      <p class="hint">Stav snehu vypočítava automatizácia v Home Assistante každých 30 minút. Ak helper chýba, sneh = 0 %. Na úplne presný vzhľad zimy bez snehu odporúčame vlastný obrázok „zima bez snehu“.</p>
      <strong>Voliteľné vlastné sezónne fotografie</strong>${fields}
      <div class="row"><label class="field">Prispôsobenie<select data-prop="background_fit"><option value="cover" ${c.background_fit!=='contain'?'selected':''}>Vyplniť obrazovku</option><option value="contain" ${c.background_fit==='contain'?'selected':''}>Celý obrázok</option></select></label><label class="field">Spustiť po (sekundy)<input data-num="idle_seconds" type="number" min="5" max="3600" value="${clamp(fixed(c.idle_seconds,30),5,3600)}"></label></div>
      <strong>Automatické spustenie / blokovanie kamier</strong>
      <label class="field">Nespúšťať pri otvorených kamerách a dialógoch<select data-bool="block_when_camera_open"><option value="true" ${c.block_when_camera_open!==false?'selected':''}>Zapnuté (odporúčané)</option><option value="false" ${c.block_when_camera_open===false?'selected':''}>Vypnuté</option></select></label>
      <label class="field">Názvy sekcií/záložiek s kamerami, oddelené čiarkou<input data-camera-views value="${esc((Array.isArray(c.camera_views)?c.camera_views:['kamery','kamera','cameras','camera']).join(', '))}" placeholder="kamery, kamera, cameras, camera"></label>
      <label class="field">Ďalšie selektory popupov kamier (voliteľné)<input data-prop="camera_block_selectors" value="${esc(c.camera_block_selectors||'')}" placeholder=".moje-kamery-popup"></label>
      <p class="hint">Predvolené spustenie: 30 sekúnd nečinnosti. Ak je otvorená sekcia #kamery, modálne okno alebo prehrávané video, odpočet sa pozastaví. Po zatvorení kamier začne celých nových 30 sekúnd. Šetrič pôsobí iba na HA stránke, kde je karta vložená.</p>
      <div class="row"><label class="field">Posun vodorovne<input data-num="background_x" type="range" min="0" max="100" value="${clamp(fixed(c.background_x,50),0,100)}"></label><label class="field">Posun zvisle<input data-num="background_y" type="range" min="0" max="100" value="${clamp(fixed(c.background_y,50),0,100)}"></label></div>
      <label class="field">Stmavenie (0–80 %)<input data-num="background_dim" type="range" min="0" max="0.8" step="0.02" value="${clamp(fixed(c.background_dim,0.14),0,0.8)}"></label><strong>Voliteľné entity</strong>${field('Vonkajšia teplota','temperature','sensor.ws2900...')}${field('Kúrenie','heating','switch.thermostat_switch')}${field('Meniny','nameday','sensor.meniny_dnes')}${field('Svetlá – oddelené čiarkou','lights','light.kuchyna,light.obyvacka')}</div>`;
    for(const el of this.shadowRoot.querySelectorAll('[data-prop],[data-key],[data-num],[data-season],[data-bool],[data-camera-views]'))el.addEventListener(el.type==='range'?'input':'change',()=>{
      const next={...this._config},prop=el.dataset.prop,key=el.dataset.key,num=el.dataset.num,season=el.dataset.season,boolean=el.dataset.bool,cameraViews=el.hasAttribute('data-camera-views');
      if(cameraViews)next.camera_views=el.value.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
      if(prop)next[prop]=el.value;
      if(boolean)next[boolean]=el.value==='true';
      if(num)next[num]=Number(el.value);
      if(season){next.seasonal_images={...(next.seasonal_images||{})};if(el.value.trim())next.seasonal_images[season]=el.value.trim();else delete next.seasonal_images[season];}
      if(key){next.entities={...(next.entities||{})};if(!el.value.trim())delete next.entities[key];else next.entities[key]=key==='lights'?el.value.split(/[,;]+/).map(s=>s.trim()).filter(Boolean):el.value.trim();}
      this._config=next;
      this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:next},bubbles:true,composed:true}));
    });
  }
}
if(!customElements.get('ha-seasons-ai-card'))customElements.define('ha-seasons-ai-card',HASeasonsFinal);
if(!customElements.get('ha-seasons-ai-editor'))customElements.define('ha-seasons-ai-editor',HASeasonsFinalEditor);
window.customCards=window.customCards||[];
if(!window.customCards.some(x=>x.type==='ha-seasons-ai-card'))window.customCards.push({type:'ha-seasons-ai-card',name:'HA Seasons AI V1.2 – sviatky',description:'AI sezóny, sviatky, počasie, sneh a blokovanie šetriča pri otvorených kamerách',preview:true});
