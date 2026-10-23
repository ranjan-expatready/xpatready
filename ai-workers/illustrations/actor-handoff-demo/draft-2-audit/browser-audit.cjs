const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const OUT = __dirname;
const INPUT = path.join(OUT, 'inputs/ai-workers/problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html');
const results = { input: INPUT, observations: [], errors: [], cards: [], screenshots: [] };
function note(name, data) { results.observations.push({name, data}); }
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  for (const width of [1440,1280,1000,768,375,320,1920]) {
    const ctx = await browser.newContext({viewport:{width,height:950},hasTouch:width<1000,isMobile:width<600});
    const p = await ctx.newPage();
    p.on('pageerror', e => results.errors.push({width,error:e.message}));
    await p.goto('file://' + INPUT);
    await p.waitForSelector('body[data-ready="true"]');
    note('viewport', await p.evaluate(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,navHeight:document.querySelector('.nav').offsetHeight,
      height:document.documentElement.scrollHeight,visibleWords:document.querySelector('main').innerText.trim().split(/\s+/).length,
      diagramCount:document.querySelectorAll('.dg').length,eyeCount:document.querySelectorAll('.eye').length,
      sections:[...document.querySelectorAll('main>section')].map(s=>({id:s.id,words:s.innerText.trim().split(/\s+/).length,height:s.offsetHeight}))})));
    if(width===1440) {
      await p.screenshot({path:path.join(OUT,'desktop-top.png')});
      for(const vid of ['v0','v1','v2','v3','v4','v5','v6','v7']) {
        const target=p.locator('#dg-'+vid);
        await target.screenshot({path:path.join(OUT,'diagram-'+vid+'.png')});
        results.screenshots.push('diagram-'+vid+'.png');
      }
      const ids=await p.evaluate(()=>Object.keys(JSON.parse(document.querySelector('#dg-data').textContent).acts));
      for(const id of ids) {
        await p.evaluate(id=>S1.open(id),id);
        results.cards.push(await p.evaluate(id=>({id,title:document.querySelector('#insp h2').textContent,
          text:document.querySelector('#insp .body').textContent,groups:document.querySelectorAll('#insp dt').length,
          example:document.querySelector('#insp .example').textContent}),id));
      }
      await p.evaluate(()=>S1.close());
      await p.locator('#view-v2').scrollIntoViewIfNeeded();
      await p.locator('.eye[data-act="3.8"]').focus();
      await p.keyboard.press('Enter');
      note('late-activity-inspector-visibility',await p.evaluate(()=>{
        const eye=document.querySelector('.eye[data-act="3.8"]'),er=eye.getBoundingClientRect(),r=document.querySelector('#insp').getBoundingClientRect();
        const x=er.x+er.width/2,y=er.y+er.height/2; const at=document.elementFromPoint(x,y);
        return {width:innerWidth,eye:{x:er.x,y:er.y,w:er.width,h:er.height},inspector:{x:r.x,w:r.width},eyeActuallyExposed:at===eye||eye.contains(at),elementAtEye:at?.tagName,selected:document.querySelector('.djs-element.sel')?.getAttribute('data-element-id')};
      }));
      await p.locator('#insp .ex-btn').click();
      await p.locator('#insp').screenshot({path:path.join(OUT,'inspector-3-8.png')});
      await p.keyboard.press('Escape');
      await p.locator('#view-v3').scrollIntoViewIfNeeded();
      await p.locator('.eye[data-act="5.1"]').hover();
      await p.waitForTimeout(400);
      note('tooltip-attributes',await p.evaluate(()=>({open:!document.querySelector('#tip').hidden,pointerEvents:getComputedStyle(document.querySelector('#tip')).pointerEvents,
        ariaDescribedBy:document.querySelector('.eye[data-act="5.1"]').getAttribute('aria-describedby')})));
      await p.keyboard.press('Escape');
      note('tooltip-escape',await p.evaluate(()=>({hidden:document.querySelector('#tip').hidden})));
      const tip=await p.locator('#tip').boundingBox();
      if(tip){await p.mouse.move(tip.x+5,tip.y+5);await p.waitForTimeout(100);note('tooltip-pointer-entry',await p.evaluate(()=>({hidden:document.querySelector('#tip').hidden})));}
    }
    if(width===375){
      await p.screenshot({path:path.join(OUT,'phone-top.png')});
      await p.locator('#view-v5 .fl-open[data-act="8.4"]').tap();
      note('phone-modal-background',await p.evaluate(()=>({modal:document.querySelector('#insp').getAttribute('aria-modal'),
        mainInert:document.querySelector('main').inert,mainAriaHidden:document.querySelector('main').getAttribute('aria-hidden'),bodyOverflow:getComputedStyle(document.body).overflow,
        dialogTop:document.querySelector('#insp').getBoundingClientRect().top,active:document.activeElement.tagName})));
      await p.locator('#insp .ex-btn').tap();
      await p.screenshot({path:path.join(OUT,'phone-inspector.png')});
      await p.keyboard.press('Escape');
    }
    if(width===1920){
      await p.locator('#view-v2').scrollIntoViewIfNeeded();
      const before=await p.evaluate(()=>({y:scrollY,main:document.querySelector('main').getBoundingClientRect().toJSON()}));
      await p.locator('.eye[data-act="3.2"]').click();
      note('wide-dock-position',{before,after:await p.evaluate(()=>({y:scrollY,main:document.querySelector('main').getBoundingClientRect().toJSON()}))});
      await p.keyboard.press('Escape');
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT,'browser-observations.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({errors:results.errors,observations:results.observations,cards:results.cards.length,screenshots:results.screenshots},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
