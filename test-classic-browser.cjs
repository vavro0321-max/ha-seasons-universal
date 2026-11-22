'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'dist');
const mime={'.js':'text/javascript;charset=utf-8','.html':'text/html;charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const requested=decodeURIComponent((req.url||'/').split('?')[0]);
 const absolute=path.resolve(root,'.'+requested);
 if(!absolute.startsWith(root+path.sep)||!fs.existsSync(absolute)||!fs.statSync(absolute).isFile()){
   res.writeHead(404);res.end('Not found');return;
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(absolute)]||'application/octet-stream','Cache-Control':'no-store'});
 fs.createReadStream(absolute).pipe(res);
});
(async()=>{
 const base=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1365,height:768}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',resp=>{if(resp.url().startsWith(base)&&resp.status()>=400)errors.push('HTTP '+resp.status()+' '+resp.url());});
  await page.goto(base+'/TEST.html',{waitUntil:'networkidle'});
  await page.click('#open');
  await page.waitForFunction(()=>document.querySelector('#card')?._root?.querySelector('.screen'));
  const measure=()=>page.evaluate(()=>{
    const c=document.querySelector('#card'),r=c._root;
    return {
     screenWidth:r.querySelector('.screen').getBoundingClientRect().width,
     base:r.querySelector('.photo-night').style.backgroundImage,
     day:r.querySelector('.photo-day').style.backgroundImage,
     twilight:r.querySelector('.photo-twilight').style.backgroundImage,
     nightLevel:c._data.blend.nightLight,
     dayOpacity:Number(r.querySelector('.photo-day').style.opacity),
     twilightOpacity:Number(r.querySelector('.photo-twilight').style.opacity),
     wasteDisplay:r.querySelector('.wastebar').style.display,
     municipal:r.querySelector('[data-waste="municipal"]').textContent,
     recycling:r.querySelector('[data-waste="recycling"]').textContent
    };
  });
  let a=await measure();
  assert(a.day.includes('autumn-full-v81'),'Original scenery retained');
  assert(a.wasteDisplay==='flex','Waste strip appears with actual sensors');
  assert(a.municipal.includes('Komunálny odpad')&&a.recycling.includes('Separovaný odpad'),'Both pickups visible');
  await page.evaluate(()=>{
    const control=document.querySelector('#elevation');control.value='-7';
    control.dispatchEvent(new Event('input',{bubbles:true}));
  });
  a=await measure();
  assert(a.twilightOpacity>0&&a.twilightOpacity<1,'Twilight fades gradually');
  assert(a.dayOpacity===0,'Day photo not visible below horizon');
  await page.evaluate(()=>{
    const control=document.querySelector('#elevation');control.value='5';
    control.dispatchEvent(new Event('input',{bubbles:true}));
  });
  a=await measure();
  assert(a.dayOpacity>0&&a.dayOpacity<1,'Day photo fades gradually after sunrise');
  await page.evaluate(()=>{
    const c=document.querySelector('#card');
    delete c._hass.states['sensor.najblizsi_komunalny_odpad'];
    delete c._hass.states['sensor.najblizsi_triedeny_zber'];
    c._update();
  });
  a=await measure();
  assert.equal(a.wasteDisplay,'none','No pickup entity => no waste decoration');
  await page.setViewportSize({width:360,height:800});
  a=await measure();
  assert(a.screenWidth>=359&&a.screenWidth<=361,'Fits phone portrait');
  await page.setViewportSize({width:1280,height:800});
  a=await measure();
  assert(a.screenWidth>=1279&&a.screenWidth<=1281,'Fits tablet landscape');
  await page.evaluate(()=>document.querySelector('#card')._close());
  assert.deepEqual(errors,[],'No JavaScript or image-loading errors');
  console.log('PASS Classic real Chrome: original landscape, dawn crossfade, both waste cards, missing sensors and portrait/landscape');
  await page.close();
 }finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
