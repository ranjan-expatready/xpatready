const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = {run: new Date().toISOString(), occlusions: [], screenshots: [], phone: {}};
(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  for (const width of [1000, 1024, 1100, 1280, 1440]) {
    const ctx = await browser.newContext({viewport:{width,height:950}});
    const page = await ctx.newPage();
    await page.goto('file://' + path.join(__dirname,'solution-1-one-pager.html'));
    await page.waitForSelector('body[data-ready="true"]');
    const ids = await page.evaluate(() => Object.keys(JSON.parse(document.querySelector('#dg-data').textContent).acts));
    for (const id of ids) {
      await page.evaluate(() => S1.close());
      const eye = page.locator('.eye[data-act="' + id + '"]').first();
      await eye.scrollIntoViewIfNeeded();
      await eye.click();
      const result = await page.evaluate(id => {
        const D = JSON.parse(document.querySelector('#dg-data').textContent), a=D.acts[id];
        const g=document.querySelector('#dg-' + a.vid + ' [data-element-id="' + a.node + '"]');
        const r=g.getBoundingClientRect(), panel=document.querySelector('#insp').getBoundingClientRect();
        const overlapWidth=Math.max(0,Math.min(r.right,panel.right)-Math.max(r.left,panel.left));
        const overlapHeight=Math.max(0,Math.min(r.bottom,panel.bottom)-Math.max(r.top,panel.top));
        const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return {id,shape:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},panel:{left:panel.left,right:panel.right},
          overlapWidth,overlapHeight,centerUnderPanel:document.querySelector('#insp').contains(hit)};
      },id);
      if(result.overlapWidth>0 && result.overlapHeight>0) out.occlusions.push({width,...result});
    }
    if(width===1440) {
      await page.evaluate(() => S1.close());
      for(const v of ['v3','v4','v5','v6']) {
        const name='revised-'+v+'.png';
        await page.locator('#dg-'+v).screenshot({path:path.join(__dirname,name)});
        out.screenshots.push(name);
      }
    }
    await ctx.close();
  }
  const ctx=await browser.newContext({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
  const page=await ctx.newPage();
  await page.goto('file://' + path.join(__dirname,'solution-1-one-pager.html'));
  await page.waitForSelector('body[data-ready="true"]');
  await page.locator('#view-v5 .fl-open[data-act="8.4"]').click();
  let allInside=true;
  for(let i=0;i<18;i++) {await page.keyboard.press('Shift+Tab');allInside=allInside&&await page.evaluate(()=>document.querySelector('#insp').contains(document.activeElement));}
  out.phone.reverseTabInside=allInside;
  await page.keyboard.press('Escape');
  out.phone.escape=await page.evaluate(()=>({closed:document.querySelector('#insp').hidden,inert:document.querySelector('main').inert,focus:document.activeElement.dataset.act}));
  await ctx.close();
  await browser.close();
  fs.writeFileSync(path.join(__dirname,'additional-observations.json'),JSON.stringify(out,null,2));
  console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
