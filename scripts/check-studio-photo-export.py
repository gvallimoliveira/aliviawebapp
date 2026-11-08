"""Pixel regression for the running Studio, including WebKit without canvas filters."""
import asyncio
import base64
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT = Path('/tmp/browser/studio-photo-regression')
OUTPUT.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        results = {}
        for engine in ('chromium', 'webkit'):
            browser = await getattr(playwright, engine).launch(headless=True)
            page = await browser.new_page(viewport={'width': 1280, 'height': 1800})
            await page.goto('http://localhost:8080')
            results[engine] = await page.evaluate('''async () => {
              const {renderNodeToBlob} = await import('/src/pages/studio/exportImage.ts');
              const {applyPhotoShade} = await import('/src/pages/studio/photoLight.ts');
              const {applyInsertedArtImage} = await import('/src/pages/studio/artPhotoSwap.tsx');
              const c=document.createElement('canvas');c.width=c.height=400;
              const ctx=c.getContext('2d');ctx.fillStyle='rgb(160,180,200)';ctx.fillRect(0,0,400,400);
              const src=c.toDataURL();
              const n=document.createElement('div');n.style.cssText='position:relative;width:400px;height:400px;background:white';
              document.body.append(n);
              const output=[];
              for(const inserted of [false,true]) {
                n.innerHTML=inserted
                  ? '<section style="position:relative;width:400px;height:400px;background:rgba(0,100,0,.4)"><div aria-hidden="true" style="position:absolute;inset:0;background:linear-gradient(red,blue)"></div><p style="position:absolute;left:150px;top:170px;width:100px;height:30px;background:white">TEXT</p></section>'
                  : `<section data-studio-photo-background="1" style="position:relative;width:400px;height:400px;background:rgba(0,100,0,.4)"><div data-studio-photo-frame="1" style="position:absolute;inset:0"><img data-studio-photo="1" src="${src}" style="width:100%;height:100%"></div><div data-studio-overlay="1" style="position:absolute;inset:0;background:linear-gradient(transparent,rgba(0,0,0,.8))"></div><p style="position:absolute;left:150px;top:170px;width:100px;height:30px;background:white">TEXT</p></section>`;
                if(inserted) applyInsertedArtImage(n,{mode:'background',x:0,y:0,width:1,photo:{src,focusX:50,focusY:50,rotation:0,zoom:1,safeArea:'none'}});
                for(const shade of [0,50,100]) {
                  applyPhotoShade(n,shade);
                  const blob=await renderNodeToBlob(n,1);
                  const img=new Image();img.src=URL.createObjectURL(blob);await img.decode();
                  ctx.clearRect(0,0,400,400);ctx.drawImage(img,0,0);
                  output.push({inserted,shade,top:[...ctx.getImageData(200,30,1,1).data],bottom:[...ctx.getImageData(200,350,1,1).data],text:[...ctx.getImageData(245,195,1,1).data],png:c.toDataURL()});
                  URL.revokeObjectURL(img.src);
                }
                // Restored HTML must retain shade, photo and suppressed decoration.
                const html=n.innerHTML;n.innerHTML=html;applyPhotoShade(n,100);
              }
              n.remove();return output;
            }''')
            for result in results[engine]:
                png=result.pop('png')
                (OUTPUT / f"{engine}-{'inserted' if result['inserted'] else 'gradient'}-{result['shade']}.png").write_bytes(base64.b64decode(png.split(',')[1]))
                if result['shade']==0:
                    assert all(abs(a-b)<=2 for a,b in zip(result['top'],[160,180,200,255])), result
                assert all(channel>=250 for channel in result['text']), result
            for offset in (0,3):
                series=results[engine][offset:offset+3]
                assert series[0]['top'][0]>series[1]['top'][0]>series[2]['top'][0], series
                assert series[0]['bottom'][0]>series[1]['bottom'][0]>series[2]['bottom'][0], series
            await browser.close()
        for chromium,webkit in zip(results['chromium'],results['webkit']):
            for point in ('top','bottom'):
                assert max(abs(a-b) for a,b in zip(chromium[point],webkit[point]))<=3, (chromium,webkit)
        print('12 PNGs verified: zero/mid/full shade, gradient, inserted background, text and Chromium/WebKit parity.')

asyncio.run(main())