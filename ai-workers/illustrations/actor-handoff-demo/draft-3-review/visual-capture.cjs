// Checker's visual capture of draft 3 (f351d479): sections at 1440, 1280, 375 px, light and dark; tooltips at 1440 light.
// For element captures the sticky navigation is made static so it does not cover the top of a section (capture only).
const path=require('node:path');const fs=require('node:fs');
const {chromium}=require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const PAGE='file://'+path.join(__dirname,'current-f351d479','solution-1-one-pager.html');const OUT=path.join(__dirname,'visual');
const log=[];
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});
for(const [w,h] of [[1440,900],[1280,800],[375,812]]) for(const s of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:s,hasTouch:w<1000,isMobile:w<600,deviceScaleFactor:1});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(PAGE);await p.waitForSelector('body[data-ready="true"]');await p.waitForTimeout(500);
  const tag=`${w}-${s}`;const shot=async(name,sel)=>{const el=p.locator(sel).first();if(!(await el.count())){log.push(`${tag} ${name}: missing ${sel}`);return;}
    await p.mouse.move(0,0);await el.scrollIntoViewIfNeeded();await p.mouse.move(0,0);await p.evaluate(()=>{const t=document.getElementById("tip");if(t)t.hidden=true;});await p.waitForTimeout(150);await el.screenshot({path:path.join(OUT,`${tag}-${name}.png`)});};
  // stage panel first, with the real sticky nav, as a viewport capture
  await p.locator('#st-5 .det').scrollIntoViewIfNeeded();await p.locator('#st-5 .det').click();await p.waitForTimeout(400);
  await p.screenshot({path:path.join(OUT,`${tag}-panel-stage5.png`)});await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.locator('#view-v5').scrollIntoViewIfNeeded();await p.waitForTimeout(200);await p.screenshot({path:path.join(OUT,`${tag}-viewport-view5.png`)});
  await p.addStyleTag({content:'.nav{position:static!important}'});
  const top=await p.evaluate(()=>{window.scrollTo(0,0);return Math.round(document.getElementById('overview').getBoundingClientRect().top+window.scrollY);});
  await p.screenshot({path:path.join(OUT,`${tag}-intro.png`),fullPage:true,clip:{x:0,y:0,width:w,height:top}});
  await shot('map-strip','#overview .stagestrip');await shot('map-setup','#overview .band-setup');await shot('map-pkg-rail','#overview .mrail-pkg');
  await shot('map-case','#overview .band-case');await shot('map-x-rail','#overview .mrail-x');await shot('map-change','#overview .band-change');
  await shot('who','#who');
  await p.locator('#overview-bpmn summary').first().click().catch(()=>{});await p.waitForTimeout(800);await shot('tech-overview','#overview-bpmn');
  for(let i=1;i<=7;i++) await shot(`view${i}`,`#view-v${i}`);
  for(const n of ['controls','records','cases','evidence']) await shot(n,'#'+n);
  log.push(`${tag}: errors ${errs.length}`);
  if(w===1440&&s==='light'){
    const tip=async(name,sel)=>{const el=p.locator(sel).first();if(!(await el.count())){log.push(`tip ${name}: missing ${sel}`);return;}await el.scrollIntoViewIfNeeded();await el.hover({force:true});await p.waitForTimeout(500);
      const r=await el.boundingBox();const t=await p.evaluate(()=>{const t=document.getElementById('tip');return t&&!t.hidden?{txt:t.textContent,r:t.getBoundingClientRect().toJSON()}:null});
      log.push(`tip ${name}: ${t?t.txt.slice(0,160):'NONE'}`);
      const x=Math.max(0,Math.min(r.x,(t?t.r.x:r.x))-20),y=Math.max(0,Math.min(r.y,(t?t.r.y:r.y))-20);const x2=Math.min(w,Math.max(r.x+r.width,(t?t.r.right:0))+20),y2=Math.min(h,Math.max(r.y+r.height,(t?t.r.bottom:0))+20);
      await p.screenshot({path:path.join(OUT,`tip-${name}.png`),clip:{x,y,width:x2-x,height:y2-y}});await p.mouse.move(1,1);await p.waitForTimeout(150);};
    await tip('eye-map','#st-3 .det');await tip('side-tag','#st-3 .side');await tip('atype','.dg .atype');await tip('lanetag','.dg .lanetag');
    await tip('gateway','#dg-v3 [data-element-id^="X"]');await tip('rtag','#records .rtag');await tip('alink','#records .alink');await tip('task-eye','#dg-v5 .eye');
    await tip('map-decision-mark','#st-3 .gate .mk, #st-3 [class*=gate] [data-tip]');
  }
  await ctx.close();}
await b.close();fs.writeFileSync(path.join(OUT,'capture-log.txt'),log.join('\n'));console.log(log.join('\n'));})();
