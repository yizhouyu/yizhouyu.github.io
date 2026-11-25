// the well-written layer: how it works, what is simplified, sources
export function about(el, lang, T, meta) {
  const zh = lang === 'zh';
  const a = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  const W = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5876805/', L = 'https://par.nsf.gov/servlets/purl/10081075', B = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3448657/', U = 'https://www.utsouthwestern.edu/newsroom/articles/year-2022/selfies-may-drive-plastic-surgery.html', AP = 'https://support.apple.com/en-us/121029', G = 'https://people.csail.mit.edu/yichangshih/wide_angle_portrait/', HB = 'https://www.blender.org/download/demo-files/#assets';
  el.innerHTML = `<button class="x t" type="button" autofocus>${T.close}</button>` + (zh ? `
<h2>怎么算的</h2>
<p>照片上一样东西的大小，和它真实的大小除以它到镜头的距离成正比。鼻子比颧骨近 7 厘米左右。手机在 20 厘米外，这 7 厘米差了一大截；在 1.5 米外，几乎可以不计。页面上每个百分比，都是用这条规则在雕像上现算的。</p>
<p>「鼻子宽了」的意思：把照片缩放到颧骨一样宽，再和从无穷远拍的比，鼻翼宽了多少。镜头到脸的距离，从镜头量到鼻尖。「耳朵露出多少」是数照片里耳朵占的像素，和远处拍的比。</p>
<h2>和研究对得上吗</h2>
<p>${a(W, 'Ward 等人 2018 年')}发表在《JAMA Facial Plastic Surgery》：离 12 英寸（约 30 厘米）拍，男性鼻子显得宽 30%，女性 29%；5 英尺（1.5 米）外「基本没有差别」。我们的测试用他们的公式和他们的平均脸算出同样的 30% 和 29%（按同一公式，1.5 米处还剩约 6.5%）。他们把颧骨放在头的正中间，我们雕像的颧骨更靠前，和真头骨一样，所以同样 30 厘米，石膏那位是 22% 左右。</p>
<p>2022 年，${a(U, '得州大学西南医学中心')}给 30 位真人拍照：12 英寸自拍里，鼻子平均长了 6.4%，18 英寸长了 4.3%，都是和 5 英尺外的照片比。</p>
<h2>有人反对</h2>
<p>也是 2018 年，${a(L, 'Cooper 和 Banks 写信')}说：算得没错，但照片没有变形。每张照片都有一个正确的观看距离，那篇论文里的自拍大约是照片宽度的两倍，在那里看，鼻子就正常；只是大家看照片都离得太远。原作者回信接受了这一点，也说现实里几乎没人会站到那么近去看。结尾的「近拍的照片并没有撒谎」让你自己试。</p>
<p>近拍还会影响别人怎么看你：${a(B, 'Bryan、Perona、Adolphs 2012 年')}的实验里，45 厘米拍的脸比 135 厘米拍的同一张脸，得到的信任和好感更少。</p>
<h2>合影的边上</h2>
<p>平的照片要装下很宽的视野，边上就得拉长：一个圆球偏离正前方 49 度，会被拉成约 1.5 倍长的椭圆；页面里的合影是在 60 厘米外拍的，边上正好是这个角度。手机超广角（0.5×）的对角线视野大约 120 度，见 ${a(AP, '苹果的规格')}。很多手机现在会悄悄把边上的脸修回来，${a(G, 'Google 2019 年的论文')}讲了怎么修；所以你手机上的效果可能比这里轻。</p>
<h2>哪些简化了</h2>
<p>镜头按理想的小孔算，没有美颜，没有手机的自动修脸。雕像不会笑，也不会动。「到耳朵的距离」量到耳廓最外边。合影里的 5 位站成一条直线，相隔 37.5 厘米，都看着镜头。看照片的距离按你的屏幕大小估算。没有用你的摄像头：在浏览器里很难量准，也没有必要。</p>
<h2>这些头像是谁</h2>
<p>谁也不是。5 尊胸像从 Blender Studio 的 ${a(HB, 'Human Base Meshes')}（CC0，艺术家手工建的通用人体，不是扫描）改出来：脸型、鼻子、年纪、发式、胡子、眼睛都是这个页面用程序雕的；猫是从头雕的。尺寸是真人尺寸：两眼相距 6.6 厘米，颧骨宽 14.4 厘米，和上面研究里的平均男性（14.35 厘米）几乎一样。窗光、天光、轮廓光都是模拟的，提前算好。孩子的头宽按成人算，这一点不准。</p>
<h2>字体</h2><p>Bodoni Moda、Jost、Noto Serif SC，都是 SIL 开放字体许可（OFL）。</p>` : `
<h2>How it is worked out</h2>
<p>In a photo, a thing's size is proportional to its real size divided by its distance from the lens. Your nose is about 7 cm nearer than your cheekbones. With the phone 20 cm away those 7 cm matter a lot; from 1.5 m they hardly count. Every percentage here is computed live on the sculpture with that one rule.</p>
<p>“How much wider the nose looks” means: scale the photo until the cheekbones are equally wide, then compare the width of the nostrils with a photo taken from infinitely far. Distance is measured from the lens to the tip of the nose. “Ears in view” counts the pixels the ears take, compared with far away.</p>
<h2>Does it match research?</h2>
<p>${a(W, 'Ward and colleagues, 2018')}, JAMA Facial Plastic Surgery: at 12 inches (about 30 cm) a nose looks 30% wider in men and 29% in women; at 5 feet (1.5 m) there is “essentially no difference”. Our tests put their average face into their formula and get the same 30% and 29% (the same formula still leaves about 6.5% at 5 feet). They place the cheekbones half way back in the head; on our sculptures, as on a skull, they sit further forward, so at 30 cm the plaster sitter shows about 22%.</p>
<p>In 2022 ${a(U, 'UT Southwestern')} photographed 30 people: in 12-inch selfies the nose came out 6.4% longer on average, at 18 inches 4.3%, compared with photos from 5 feet.</p>
<h2>The objection</h2>
<p>Also in 2018, ${a(L, 'Cooper and Banks wrote in')}: the arithmetic is right, but the photo is not distorted. Every photo has a correct viewing distance, for the selfie in that paper roughly twice the photo's width; seen from there the nose is normal. We simply look from too far away. The authors accepted the point, and replied that in real life hardly anyone looks from there. “The close photo is not lying”, after the ending, lets you try it.</p>
<p>Closeness also changes how you are judged: in experiments by ${a(B, 'Bryan, Perona and Adolphs, 2012')}, faces photographed from 45 cm got less trust and liking than the same faces from 135 cm.</p>
<h2>The edge of a group photo</h2>
<p>To fit a very wide view on a flat picture, the edges must be stretched: a ball 49 degrees off the axis becomes an ellipse about 1.5 times as long as wide; the group here is shot from 60 cm, where the edge is at that angle. A phone's ultra-wide (0.5×) sees about 120 degrees corner to corner, see ${a(AP, 'Apple’s specifications')}. Many phones now quietly repair faces at the edge, ${a(G, 'Google’s 2019 paper')} explains how, so on your phone the effect may be milder than here.</p>
<h2>What is simplified</h2>
<p>The lens is an ideal pinhole; no beauty filter, no automatic face repair. Sculptures do not smile or move. “To the ear” is measured to the outermost rim. The five people in the group stand on one line, 37.5 cm apart, all looking at the lens. The viewing distance is estimated from the size of your screen. Your camera is not used: measuring distance with it in a browser is not reliable, and not needed.</p>
<h2>Who are these heads?</h2>
<p>Nobody. The five busts start from Blender Studio's ${a(HB, 'Human Base Meshes')} (CC0, generic bodies modelled by artists, not scans); face shapes, noses, ages, hair, beard and eyes were carved by this page's own programs; the cat was carved from scratch. They are life size: eyes 6.6 cm apart, cheekbones 14.4 cm wide, next to the average man in the study above (14.35 cm). The window, sky and rim light are simulated and were computed in advance. The child's head is as wide as an adult's, which is not right.</p>
<h2>Type</h2><p>Bodoni Moda, Jost and Noto Serif SC, all under the SIL Open Font License (OFL).</p>`);
  el.querySelector('.x').onclick = () => el.parentElement.close();
}
