// HA Seasons Rebuild v0.1 — clean-room weather, daylight and waste logic.
// Pure functions; no DOM, timers, device access or network requests.

const WEATHER = new Set(['sunny','clear-night','partlycloudy','cloudy','rainy','pouring','snowy','snowy-rainy','fog','mist','windy','windy-variant']);
const INVALID = new Set(['unknown','unavailable','none','']);
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function smoothstep(lo,hi,v){
  const x=clamp((v-lo)/(hi-lo),0,1);
  return x*x*(3-2*x);
}
export function localParts(now=new Date(),timeZone='Europe/Bratislava'){
  const f=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const v=Object.fromEntries(f.formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  return {year:v.year,month:v.month,day:v.day,hour:v.hour,minute:v.minute};
}
export function num(state){
  if(state===null||state===undefined||INVALID.has(String(state).trim().toLowerCase()))return null;
  const n=Number(state);return Number.isFinite(n)?n:null;
}
export function fresh(entity,now=new Date(),maxAgeMin=45){
  if(!entity||INVALID.has(String(entity.state).trim().toLowerCase()))return false;
  const t=entity.last_updated||entity.last_changed;
  if(!t)return true; // integrations without timestamp metadata
  const age=(now.getTime()-Date.parse(t))/60000;
  return Number.isFinite(age)&&age>=-2&&age<=maxAgeMin;
}
const state=(h,id)=>id?h?.states?.[id]:undefined;
function choose(h,explicit,candidates,predicate,now,maxAge=45){
  if(explicit&&explicit!=='auto')return state(h,explicit)&&fresh(state(h,explicit),now,maxAge)?explicit:null;
  for(const id of candidates)if(fresh(state(h,id),now,maxAge)&&num(state(h,id).state)!==null)return id;
  return Object.keys(h?.states||{}).find(id=>predicate(id)&&fresh(state(h,id),now,maxAge)&&num(state(h,id).state)!==null)||null;
}
function weatherEntity(h,explicit,now){
  const ids=explicit&&explicit!=='auto'?[explicit]:[
    'weather.forecast_cierne_11','weather.home',
    ...Object.keys(h?.states||{}).filter(id=>id.startsWith('weather.'))];
  return [...new Set(ids)].find(id=>fresh(state(h,id),now,180)&&WEATHER.has(state(h,id).state))||null;
}
export function seasonAt(p){
  return p.month>=3&&p.month<=5?'spring':p.month>=6&&p.month<=8?'summer':p.month>=9&&p.month<=11?'autumn':'winter';
}
export function daylight(h,now=new Date(),forced='auto'){
  const p=localParts(now,h?.config?.time_zone||'Europe/Bratislava');
  const sun=state(h,'sun.sun');
  let elevation=fresh(sun,now,60)&&['above_horizon','below_horizon'].includes(sun.state)?num(sun.attributes?.elevation):null;
  if(forced!=='auto'&&forced!==undefined) elevation=({day:24,dawn:-4,dusk:-4,night:-22})[forced]??null;
  if(elevation===null){
    // Explicitly approximate fallback. No false daylight after 20:00.
    elevation=p.hour<6||p.hour>=20?-22:p.hour<9?-4:p.hour>=17?-4:24;
  }
  return {
    elevation,
    night:1-smoothstep(-12,2,elevation),
    twilight:Math.max(0,1-Math.abs(elevation+3)/13),
    daylight:smoothstep(-7,12,elevation),
    phase:elevation<=-12?'night':elevation<9?'twilight':'day'
  };
}
export function currentWeather(h,opts={},now=new Date()){
  const ids=opts.entities||{},stationAge=clamp(Number(opts.station_max_age_minutes)||30,5,180);
  const local=opts.source!=='online';
  const wId=weatherEntity(h,ids.weather,now),weather=state(h,wId);
  const condition=weather?.state||'unavailable';
  const tempId=local?choose(h,ids.temperature,['sensor.ws2900_v2_02_01_outdoor_temperature'],
    id=>/sensor\..*(outdoor.*temperature|outside.*temperature|vonk.*teplot)/i.test(id),now,stationAge):null;
  const solarId=local?choose(h,ids.solar,['sensor.ws2900_v2_02_01_solar_radiation'],
    id=>/sensor\..*(solar_radiation|slnecne_ziarenie)/i.test(id),now,stationAge):null;
  const rainId=local?choose(h,ids.rain,['sensor.ws2900_v2_02_01_rain_rate'],
    id=>/sensor\..*(rain_rate|rain_intensity)/i.test(id),now,stationAge):null;
  const t=state(h,tempId),solarEntity=state(h,solarId),rainEntity=state(h,rainId);
  let temperature=num(t?.state);
  if(temperature!==null && ['°f','f'].includes(String(t?.attributes?.unit_of_measurement||'').toLowerCase()))
    temperature=(temperature-32)*5/9;
  if(temperature===null)temperature=num(weather?.attributes?.temperature);
  const solar=num(solarEntity?.state);
  let rainRate=num(rainEntity?.state);
  if(rainRate!==null && String(rainEntity?.attributes?.unit_of_measurement||'').toLowerCase()==='in/h')rainRate*=25.4;
  const d=daylight(h,now,opts.phase||'auto');
  const snow=['snowy','snowy-rainy'].includes(condition)&&(temperature===null||temperature<=2);
  const rain=(rainRate!==null&&rainRate>.08)||(
    rainRate===null&&['rainy','pouring'].includes(condition));
  let sky=['cloudy','rainy','pouring','snowy','snowy-rainy','fog','mist'].includes(condition)?'overcast':
    ['partlycloudy','windy-variant'].includes(condition)?'partly':
    condition==='unavailable'?'unknown':'clear';
  let basis=condition==='unavailable'?'none':'online';
  // A local bright reading corrects a regional overcast report conservatively.
  if(local&&solar!==null&&d.elevation>10&&!rain&&!snow&&
    (sky==='overcast'||sky==='unknown')&&solar>Math.max(140,650*Math.sin(d.elevation*Math.PI/180))){
    sky='partly';basis='station_sun';
  }
  if(rain||snow)sky='overcast';
  if(rainRate!==null&&rainRate>.08)basis='station_rain';
  return {condition,temperature,solar,rainRate,sky,precipitation:snow?'snow':rain?'rain':'none',
    basis,weatherEntity:wId,daylight:d};
}
function parsePickup(value,p){
  if(value===null||value===undefined)return null;
  const s=String(value).trim();
  if(INVALID.has(s.toLowerCase()))return null;
  const iso=/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(s);
  const sk=/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(s);
  const now=Date.UTC(p.year,p.month-1,p.day);
  let date;
  if(iso)date=Date.UTC(+iso[1],+iso[2]-1,+iso[3]);
  else if(sk)date=Date.UTC(+sk[3],+sk[2]-1,+sk[1]);
  else if(/^\d{1,3}$/.test(s)&&+s<=365)date=now+(+s)*86400000;
  else return null;
  const item=new Date(date);
  if(iso&&(item.getUTCFullYear()!==+iso[1]||item.getUTCMonth()!==+iso[2]-1||item.getUTCDate()!==+iso[3]))return null;
  if(sk&&(item.getUTCFullYear()!==+sk[3]||item.getUTCMonth()!==+sk[2]-1||item.getUTCDate()!==+sk[1]))return null;
  const days=Math.round((date-now)/86400000);
  if(days<0||days>365)return null;
  return {days,date:item.toLocaleDateString('sk-SK',{timeZone:'UTC',day:'numeric',month:'numeric',year:'numeric'}),
    when:days===0?'DNES':days===1?'ZAJTRA':`O ${days} ${days>=2&&days<=4?'dni':'dní'}`};
}
export function wasteEntries(h,opts={},now=new Date()){
  if(opts.show_waste===false)return [];
  const p=localParts(now,h?.config?.time_zone||'Europe/Bratislava');
  const e=opts.entities||{};
  const groups=[
    {kind:'municipal',label:'Komunálny odpad',icon:'🗑️',key:'waste_municipal',
      ids:['sensor.najblizsi_komunalny_odpad','sensor.najblizsi_komunalni_odpad'],pattern:/komunaln|municipal_waste/i},
    {kind:'recycling',label:'Separovaný odpad',icon:'♻️',key:'waste_recycling',
      ids:['sensor.najblizsi_triedeny_zber','sensor.najblizsi_triedeni_zber'],pattern:/trieden|separ|recycl/i}
  ];
  return groups.flatMap(g=>{
    const matches=e[g.key]?[e[g.key]]:[...g.ids,...Object.keys(h?.states||{}).filter(id=>id.startsWith('sensor.')&&g.pattern.test(id))];
    for(const id of [...new Set(matches)]){
      const item=state(h,id); if(!item)continue;
      for(const val of [item.state,item.attributes?.next_collection,item.attributes?.next_date]){
        const pickup=parsePickup(val,p);
        if(pickup)return [{...g,entityId:id,...pickup}];
      }
    }
    return [];
  });
}
export function viewModel(h,config={},now=new Date()){
  const parts=localParts(now,h?.config?.time_zone||'Europe/Bratislava');
  return {parts,season:config.season&&config.season!=='auto'?config.season:seasonAt(parts),
    weather:currentWeather(h,config,now),waste:wasteEntries(h,config,now)};
}
