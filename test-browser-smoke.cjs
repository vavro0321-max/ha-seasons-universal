'use strict';
// Browser-level smoke audit, not just regex/source assertions.
// Runs in a real Google Chrome instance on GitHub Actions Ubuntu runners.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.join(__dirname,'dist');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
  '.webp':'image/webp','.svg':'image/svg+xml','.css':'text/css;charset=utf-8'};
const server=http.createServer((req,res)=>{
  const raw=decodeURIComponent((req.url||'/').split('?')[0]);
  const file=path.resolve(root,'.'+raw);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    res.writeHead(404);res.end('Not found');return;
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
const launch=()=>new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port));
});
(async()=>{
  let browser;
  const base=await launch(),pageErrors=[];
  try{
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    const page=await context.newPage();
    page.on('pageerror',error=>pageErrors.push(error.stack||error.message));
    page.on('response',response=>{
      if(response.status()>=400&&response.url().startsWith(base))pageErrors.push('HTTP '+response.status()+' '+response.url());
    });
    await page.goto(base+'/ADVENT-TEST.html',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>!document.querySelector('#open').disabled);
    const scenario=async({date,phase,weather='cloudy',decor='both',viewport})=>{
      if(viewport)await page.setViewportSize(viewport);
      await page.selectOption('#date',date);
      await page.selectOption('#phase',phase);
      await page.selectOption('#weather',weather);
      await page.selectOption('#decor',decor);
      await page.click('#open');
      await page.waitForFunction(()=>document.querySelector('#card')?._root?.querySelector('.screen'));
      const details=await page.evaluate(()=>{
        const card=document.querySelector('#card'),d=card._data,root=card._root;
        const image=root.querySelector('.photo').style.backgroundImage;
        const candles=[...root.querySelectorAll('[data-photo-candle]')].filter(x=>Number(x.style.opacity)>.8).length;
        return {scene:d.scene,clouds:d.clouds,precipitation:d.precipitation,snowingNow:d.snowingNow,
          candlesExpected:d.holiday.candles,candlesLit:candles,image,
          backgroundSize:root.querySelector('.photo').style.backgroundSize,
          winterNoSnow:root.querySelector('.unified-map .us-snow')?.style.opacity,
          photoOverlay:root.querySelector('.advent-photo-overlay')?.style.display,
          width:root.querySelector('.screen').getBoundingClientRect().width};
      });
      await page.evaluate(()=>document.querySelector('#card')._close());
      return details;
    };
    let a=await scenario({date:'2026-11-29',phase:'night',weather:'snowy'});
    assert.equal(a.candlesExpected,1,'First Advent Sunday has one candle');
    assert.equal(a.candlesLit,1,'One photorealistic wick flame is lit');
    assert(a.image.includes('advent-snow-night-unlit.webp'),'Night prior to St Nicholas');
    a=await scenario({date:'2026-12-06',phase:'night',weather:'snowy'});
    assert.equal(a.candlesExpected,2);
    assert.equal(a.candlesLit,2,'Two flames must show on 6 December');
    assert(a.image.includes('advent-snow-night.webp'),'Tree lit after St Nicholas');
    a=await scenario({date:'2026-12-20',phase:'night',weather:'snowy',viewport:{width:360,height:800}});
    assert.equal(a.candlesExpected,4);
    assert.equal(a.candlesLit,4);
    assert(a.width>=359&&a.width<=361,'Responsive mobile viewport');
    a=await scenario({date:'2026-12-06',phase:'day',weather:'snowy',viewport:{width:768,height:1024}});
    assert.equal(a.candlesExpected,2);
    assert.equal(a.candlesLit,0,'Advent candle flames are invisible in daytime');
    assert(a.image.includes('advent-snow-day.webp'),'Use a real daylight Advent photo');
    a=await scenario({date:'2026-12-06',phase:'night',weather:'cloudy'});
    assert(a.image.includes('advent-snow-night.webp'),
      'Winter holiday scenery is snowy even if it is not actively snowing');
    assert.equal(a.snowingNow,false);
    a=await scenario({date:'2026-12-25',phase:'night',weather:'cloudy'});
    assert.equal(a.candlesExpected,0,'No Advent flames after Christmas Eve');
    assert.equal(a.candlesLit,0);
    a=await scenario({date:'2026-12-06',phase:'night',weather:'snowy',decor:'none'});
    assert.equal(a.candlesLit,0,'Disabled decorations have no photo flames');
    a=await scenario({date:'2027-01-07',phase:'day',weather:'partlycloudy'});
    assert.equal(a.candlesExpected,0,'No Advent candles after 6 January');
    assert(a.image.includes('winter-snow-landscape.webp'),'Still snowy winter scenery');
    assert.equal(a.snowingNow,false,'No fake falling flakes in dry winter');
    // "Zima bez snehu" must switch off both photo snow and all procedural snow.
    await page.selectOption('#date','2027-01-07');await page.selectOption('#phase','day');
    await page.selectOption('#weather','cloudy');await page.click('#open');
    const dry=await page.evaluate(()=>{
      const c=document.querySelector('#card');c.setConfig({...c._config,snow_landscape:'bare'});
      c._update();
      const root=c._root;
      return {image:root.querySelector('.photo').style.backgroundImage,
        unifiedSnow:root.querySelector('.us-snow').style.opacity,
        frost:root.querySelector('.frost-cover').style.opacity};
    });
    assert(dry.image.includes('universal-landscape-winter-dry.webp'),'Dry setting uses dry winter photo');
    assert.equal(dry.unifiedSnow,'0');
    assert.equal(dry.frost,'0');
    await page.evaluate(()=>document.querySelector('#card')._close());
    // Weather rendering: partly should be visibly less cloudy than overcast.
    await page.goto(base+'/TEST.html',{waitUntil:'networkidle'});
    // The approved app icon is part of the actual HACS asset bundle, not an
    // external or data-URI image; verify the editor uses and loads it.
    await page.click('#editorShow');
    await page.waitForTimeout(500);
    const iconDiagnostic=await page.evaluate(()=>{
      const host=document.querySelector('#editorHost');
      const editor=host?.querySelector('ha-seasons-universal-editor');
      const img=editor?.shadowRoot?.querySelector('.brand-icon');
      return {editorPresent:!!editor,registered:!!customElements.get('ha-seasons-universal-editor'),
        shadow:!!editor?.shadowRoot,html:host?.innerHTML.slice(0,350),img:!!img,
        src:img?.src,complete:img?.complete,width:img?.naturalWidth};
    });
    console.log('ICON DIAGNOSTIC',JSON.stringify(iconDiagnostic),'pageErrors',JSON.stringify(pageErrors));
    assert(iconDiagnostic.editorPresent&&iconDiagnostic.img,'Editor must contain the approved icon');
    const iconLoaded=await page.evaluate(()=>{
      const editor=document.querySelector('#editorHost ha-seasons-universal-editor');
      const img=editor.shadowRoot.querySelector('.brand-icon');
      return {src:img.src,width:img.naturalWidth,height:img.naturalHeight};
    });
    assert(iconLoaded.src.includes('/assets/app-icon.webp?v=1.12.6'),
      'Editor must show the versioned approved icon');
    assert(iconLoaded.width>=64&&iconLoaded.height>=64,
      'Real browser decoded the new icon successfully');
    const appearance=async weather=>{
      await page.selectOption('#weather',weather);
      await page.evaluate(()=>{const input=document.querySelector('#solar');input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));});await page.selectOption('#phase','day');
      await page.click('#open');
      const out=await page.evaluate(()=>{
        const c=document.querySelector('#card'),r=c._root;
        return {clouds:c._data.clouds,bank:Number(r.querySelector('.cloudbank').style.opacity),
          blue:Number(r.querySelector('.skybreak').style.opacity)};
      });
      await page.evaluate(()=>document.querySelector('#card')._close());
      return out;
    };
    const over=await appearance('cloudy'),part=await appearance('partlycloudy');
    assert.equal(over.clouds,'overcast');
    assert.equal(part.clouds,'partly');
    assert(part.bank<over.bank/8,'Partly sky has far fewer clouds');
    assert(part.blue>.1&&over.blue===0,'Blue opening only under partly cloudy');
    // Real rotation while the screensaver is open must preserve the scene.
    await page.goto(base+'/ADVENT-TEST.html',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>!document.querySelector('#open').disabled);
    await page.selectOption('#date','2026-12-13');
    await page.selectOption('#phase','night');
    await page.selectOption('#weather','snowy');
    await page.click('#open');
    await page.waitForFunction(()=>document.querySelector('#card')?._root?.querySelector('.screen'));
    await page.setViewportSize({width:800,height:1280});
    const rotated=await page.evaluate(()=>{
      const card=document.querySelector('#card');card._update();
      const root=card._root;
      return {width:root.querySelector('.screen').getBoundingClientRect().width,
        image:root.querySelector('.photo').style.backgroundImage,
        candles:[...root.querySelectorAll('[data-photo-candle]')]
          .filter(c=>Number(c.style.opacity)>.8).length};
    });
    assert(rotated.width>=799&&rotated.width<=801,'Screen adapts to tablet rotation');
    assert(rotated.image.includes('advent-snow-night.webp'));
    assert.equal(rotated.candles,3,'Three flames stay aligned after tablet rotation');
    await page.evaluate(()=>document.querySelector('#card')._close());
    assert.deepEqual(pageErrors,[],'No page errors or failed local assets');
    console.log('PASS real Chrome: Advent 1-4 candles/day/night, Mikulas, winter, dry override, phone/tablet rotation, clouds, assets');
    await context.close();
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
