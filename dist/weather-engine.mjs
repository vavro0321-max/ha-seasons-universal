/**
 * HA Seasons AI v1.0.0 — deterministic visual weather mapping.
 * No network requests, no API keys and no image generation on the tablet.
 * Numbers are visual intensities, not physical cloud-cover measurements.
 */
export const clamp = (value,min=0,max=1) => Math.max(min, Math.min(max, Number(value) || 0));
const supported = new Set(['sunny','clear-night','partlycloudy','cloudy','rainy','pouring','snowy','snowy-rainy','fog','mist','windy','windy-variant','hail','lightning','lightning-rainy','exceptional']);
const cloudTargets={sunny:0.03,'clear-night':0.03,partlycloudy:0.34,cloudy:0.78,rainy:0.88,pouring:0.98,snowy:0.84,'snowy-rainy':0.9,fog:0.32,mist:0.23,windy:0.22,'windy-variant':0.48,hail:0.93,lightning:0.93,'lightning-rainy':0.98,exceptional:0.72};
const invalid=new Set(['unknown','unavailable','none','']);
export function numberOrNull(value){if(value===null||value===undefined||invalid.has(String(value).trim().toLowerCase()))return null;const n=Number(value);return Number.isFinite(n)?n:null;}
export function conditionFromHass(hass,configured=''){
  const states=hass?.states||{};
  const ids=[configured,'weather.home','weather.forecast_cierne_11',...Object.keys(states).filter(x=>x.startsWith('weather.'))];
  for(const id of [...new Set(ids)]){
    const entity=states[id];
    if(id&&entity&&supported.has(String(entity.state)))return {condition:String(entity.state),entity_id:id,entity};
  }
  return {condition:'unknown',entity_id:null,entity:null};
}
export function sunFromHass(hass, forced=null, now=new Date()){
  // Forced elevation is only for offline testing, never default in Home Assistant.
  const entity=hass?.states?.['sun.sun'];
  let elevation=numberOrNull(forced);
  if(elevation===null)elevation=numberOrNull(entity?.attributes?.elevation);
  if(elevation===null&&entity?.state==='above_horizon')elevation=15;
  if(elevation===null&&entity?.state==='below_horizon')elevation=-18;
  if(elevation===null){
    // The sun integration is optional; this fallback is explicitly approximate.
    const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:hass?.config?.time_zone||'Europe/Bratislava'}).format(now));
    elevation=hour<6||hour>=21?-18:hour<9||hour>=18?-2:20;
  }
  const azimuth=numberOrNull(entity?.attributes?.azimuth);
  const sunUp=clamp((elevation+6)/13),night=clamp((-elevation-3)/13);
  // This is an artistic screen position, not a projection of the actual sky.
  const x=azimuth===null?74:clamp(11+azimuth/360*79,12,89);
  const y=clamp(30-elevation*.58,8,48);
  return {elevation,azimuth,sunUp,night,twilight:clamp(1-Math.abs(elevation+2)/11),x,y};
}
export function moonPhaseFromHass(hass,configured='sensor.moon_phase'){
  const phase=hass?.states?.[configured]?.state;
  const icons={new_moon:'🌑',waxing_crescent:'🌒',first_quarter:'🌓',waxing_gibbous:'🌔',full_moon:'🌕',waning_gibbous:'🌖',last_quarter:'🌗',waning_crescent:'🌘'};
  return {phase:icons[phase]?phase:null,icon:icons[phase]||'🌕',estimated:!icons[phase]};
}
export function visualWeather({condition='unknown',temperature=null,rainRate=null,elevation=-18,azimuth=null,moon='🌕'}={}){
  const cloud=cloudTargets[condition]??0;
  const t=numberOrNull(temperature),rain=numberOrNull(rainRate);
  const cold=t!==null&&t<=1;
  const snowing=condition==='snowy'||(condition==='snowy-rainy'&&cold);
  const raining=['rainy','pouring','lightning-rainy','hail'].includes(condition)
    ||(condition==='snowy-rainy'&&!cold)
    ||(!snowing&&rain!==null&&rain>0.12&&t!==null&&t>1);
  // At below-zero temperatures the app does not infer snowfall from a rain gauge alone.
  const precipitation=snowing?'snow':raining?'rain':'none';
  const rate=rain!==null?rain:null;
  const intensity=precipitation==='none'?0:clamp(
    rate!==null?Math.max(0.28, Math.log1p(rate)/Math.log(8)):
    (condition==='pouring'||condition==='hail'?1:condition==='snowy-rainy'?0.67:0.52));
  const fog=condition==='fog'?0.8:condition==='mist'?0.52:0;
  const cloudDark=['rainy','pouring','lightning-rainy','hail'].includes(condition)?0.88:
    condition==='snowy'?0.38:condition==='cloudy'?0.4:0.15;
  const light=clamp((elevation+6)/13),night=clamp((-elevation-3)/13);
  const twilight=clamp(1-Math.abs(elevation+2)/11);
  // Sun/moon visibility is damped by clouds and fog.
  const sunOpacity=light*clamp(1-cloud*.96)*clamp(1-fog*.8);
  const moonOpacity=night*clamp(1-cloud*.98)*clamp(1-fog*.9);
  return {condition,cloud,cloudDark,fog,precipitation,intensity,sunOpacity,moonOpacity,night,twilight,
    snowing,raining,moon,moonX:78,sunX:azimuth===null?74:clamp(11+azimuth/360*79,12,89),
    sunY:clamp(30-elevation*.58,8,48)};
}
export function readWeather(hass,config={},now=new Date(),forced=null){
  const {condition,entity_id,entity}=conditionFromHass(hass,config.weather_entity||config.entities?.weather);
  const sun=sunFromHass(hass,forced?.elevation??null,now);
  const tEnt=hass?.states?.[config.entities?.temperature||'sensor.ws2900_v2_02_01_outdoor_temperature'];
  let t=numberOrNull(tEnt?.state);
  if(t!==null&&/f/i.test(String(tEnt?.attributes?.unit_of_measurement||'')))t=(t-32)*5/9;
  if(t===null){t=numberOrNull(entity?.attributes?.temperature);if(t!==null&&/f/i.test(String(entity?.attributes?.temperature_unit||'')))t=(t-32)*5/9;}
  const rr=hass?.states?.[config.rain_rate_entity||'sensor.ws2900_v2_02_01_rain_rate'];
  let rate=numberOrNull(rr?.state);
  if(rate!==null&&String(rr.attributes?.unit_of_measurement||'').toLowerCase()==='in/h')rate*=25.4;
  const moon=moonPhaseFromHass(hass,config.moon_entity||'sensor.moon_phase');
  const wx=visualWeather({condition:forced?.condition||condition,temperature:forced?.temperature??t,
    rainRate:forced?.rainRate??rate,elevation:sun.elevation,azimuth:sun.azimuth,moon:moon.icon});
  return {...wx,sun,moonPhase:moon,temperature:t,rainRate:rate,weatherEntity:entity_id};
}
