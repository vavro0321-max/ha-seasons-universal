/** HA Seasons V0.4 — deterministic model. Snow % is a visual estimate, not physical snow depth. */
export const clampSnow=x=>Math.max(0,Math.min(100,Number(x)||0));
export function snowStep({cover=0,temperature=null,condition='unknown',rainRate=null,hours=0.5}={}){
 const old=clampSnow(cover),t=temperature===null||temperature===undefined||temperature===''?NaN:Number(temperature);
 const dt=Math.max(0,Math.min(1,Number(hours)||0));
 const validWeather=typeof condition==='string'&&!['unknown','unavailable',''].includes(condition);
 if(!Number.isFinite(t)||!validWeather)return {cover:old,delta:0,reason:'missing-data',snowing:false};
 const snowing=['snowy','snowy-rainy'].includes(condition)&&t<=1;
 const rainy=(['rainy','pouring'].includes(condition)||(rainRate!==null&&rainRate!==''&&Number.isFinite(Number(rainRate))&&Number(rainRate)>0.2))&&!snowing;
 let perHour=0;
 if(snowing)perHour=t<=-3?20:t<=-1?16:t<=0?12:6;
 else if(t<=0)perHour=0;
 else if(t<=2)perHour=-4;
 else if(t<=5)perHour=-10;
 else if(t<=8)perHour=-16;
 else perHour=-24;
 if(!snowing&&t>0&&rainy)perHour-=10;
 const updated=Math.round(clampSnow(old+perHour*dt)*10)/10;
 return {cover:updated,delta:Math.round((updated-old)*10)/10,reason:snowing?'accumulating':perHour<0?'melting':'holding',snowing};
}
