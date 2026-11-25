const A = (u, s) => `<a href="${u}" target="_blank" rel="noopener">${s}</a>`;
const L = { asme: "https://archive.org/details/gov.law.asme.a17.1.2004", up: "https://arlweb.msha.gov/s&hinfo/paper4.htm", msha: "https://arlweb.msha.gov/S&HINFO/TECHRPT/HOIST/PAPER3.HTM", gwr: "https://www.guinnessworldrecords.com/news/2023/10/How-an-Elevator-attendant-Survived-a-1-000-Ft-Fall-Down-the-Empire-State-Building-759670", wein: "https://geneweingarten.substack.com/p/plummeting-fortune", otis: "https://www.guinnessworldrecords.com/world-records/72451-first-safety-elevator-lift", eesf: "https://www.safetyandhealthmagazine.com/articles/16645-the-dos-and-donts-of-elevator-safety", bc: "https://blog.technicalsafetybc.ca/stuck-elevator-3-things-you-must-know", goudy: "https://www.theleagueofmoveabletype.com/sorts-mill-goudy", noto: "https://fonts.google.com/noto/specimen/Noto+Serif+SC", three: "https://threejs.org" };
export const aboutHTML = (l, t) => l === "zh" ? `
<h2>${t.aboutH}</h2>
<p>${t.take}</p><p class="s">依据：${A(L.eesf, "美国电梯与自动扶梯安全基金会的建议")}（停住的电梯里面是最安全的地方），${A(L.bc, "加拿大 BC 省技术安全局")}（电梯随时可能再动，自己爬出来会有生命危险）。</p>
<h3>怎么算的</h3>
<p>这里的一切都不是动画，是算出来的：轿厢、铁块、钢缆、轮子、刹车、马达、夹钳和缓冲器各有真实的重量和力，每秒算 2,000 次。12 层楼，轿厢 1.5 吨，坐满 12 人（900 公斤），平时 9 公里/小时，铁块 = 轿厢 + 45% 的满载重量，铜球在 10.8 公里/小时时卡住细绳。</p>
<p>“最少要拆几样”是电脑把每一种拆法都试了一遍得到的：哪些零件、剪几根钢缆、坐几个人、停在几楼，停着拆和开着拆，一共 303,264 次。这里说的“掉”，是撞上去比从半米高跳下来还重。</p>
<h3>省略了什么</h3>
<p>这是一部想出来的电梯，不是哪一部真的电梯，也不能告诉你怎么弄坏真的电梯。真电梯的保护比这里还多：细绳一松就停、门没锁好不走、另一套刹车拦住往上冲的轿厢，还有每年的检查。很多矮楼的电梯靠液压柱，没有钢缆；有的用扁平的带子；也不是每台马达断了电都会拖。这里没有算钢缆自己的重量、空气和门。井道为了放进屏幕，在 2 处断开缩短了；零件画得比真的大一点。断在转动途中的钢缆，这里画得比真的安静。</p>
<h3>1945 年的事</h3>
<p>6 根钢缆加 1 根管刹车的绳，是${A(L.gwr, "吉尼斯世界纪录")}的说法；${A(L.wein, "另一篇报道")}说是 8 根。她原来不在这部电梯里：撞击把她抛出自己的电梯，救援的人把她放进另一部送下楼，那一部掉了。</p>
<h3>出处</h3>
<p class="s">${A(L.asme, "ASME A17.1-2004 电梯安全规范")}：限速装置至少到 115% 才动作，9 公里/小时的电梯最高 11.3 公里/小时；夹钳的制停距离表；往上超速的保护（2.19）；铁块落地后钢缆必须打滑。${A(L.up, "往上冲的电梯：5 年至少 18 部")}（美国矿山安全与健康管理局论文）。${A(L.msha, "同一机构的试验")}：满载、刹车失灵、断电，马达自己把 600 英尺/分降到 300。${A(L.otis, "奥的斯 1854 年的演示")}，他让人砍断绳子，平台只掉了几英寸。</p>
<p class="s">字体 ${A(L.goudy, "Sorts Mill Goudy")}、${A(L.noto, "Noto Serif SC")}（OFL）；3D 用 ${A(L.three, "three.js")}（MIT）。没有跟踪，没有 cookie，没有联网请求。</p>
<p class="s">${t.drag} ${t.keys}</p>` : `
<h2>${t.aboutH}</h2>
<p>${t.take}</p><p class="s">From the ${A(L.eesf, "Elevator Escalator Safety Foundation")} (the inside of a stopped elevator is the safest place to be) and ${A(L.bc, "Technical Safety BC")} (it may move again at any time; climbing out on your own can kill).</p>
<h3>How it is worked out</h3>
<p>Nothing here is a canned animation. The car, the iron weight, the cables, the wheel, the brake, the motor, the clamps and the cushions have real masses and forces, worked out 2,000 times a second. Twelve floors; the car is 3,300 pounds and takes 12 people; it runs at 5.6 mph; the weight equals the car plus 45 % of a full load; the balls stop the thin rope at 6.7 mph.</p>
<p>“The fewest” comes from trying everything: every set of parts, every number of cables, every load and floor. Standing still and running: 303,264 trials in all. “It fell” means it hit harder than a jump from a chair (half a metre).</p>
<h3>What is left out</h3>
<p>This is an invented elevator, not any real one, and it will not tell you how to break one. Real ones have more: they stop when the thin rope goes slack, will not run with a door unlocked, carry a second brake against rushing up, and are inspected. Many low buildings have a piston instead of cables, some elevators hang on flat belts, and not every motor drags without power. The weight of the cables, the air and the doors are left out. The shaft is shortened by two breaks so that it fits your screen, and the parts are drawn a little large. Cables that part in motion are drawn calmer than they would be.</p>
<h3>1945</h3>
<p>Six cables plus the one that works the brake is how ${A(L.gwr, "Guinness World Records")} tells it; ${A(L.wein, "another account")} says eight. Oliver was not in that car when the plane struck: she was thrown out of her own, and rescuers put her into another to take her down. That one fell.</p>
<h3>Sources</h3>
<p class="s">${A(L.asme, "ASME A17.1-2004, Safety Code for Elevators")}: the governor acts at 115 % of the normal speed or more, and by 3.15 m/s for a 2.5 m/s car; the table of stopping distances; protection against overspeed upward (2.19); the ropes must slip once the weight has landed. ${A(L.up, "Elevators that ran up: at least 18 in five years")} (Mine Safety and Health Administration paper). ${A(L.msha, "A test by the same agency")}: full load, brakes failed, power cut: the motor alone held 600 ft/min down to 300. ${A(L.otis, "Otis in 1854")}: the platform dropped only a few inches.</p>
<p class="s">Type: ${A(L.goudy, "Sorts Mill Goudy")}, ${A(L.noto, "Noto Serif SC")} (OFL). 3D: ${A(L.three, "three.js")} (MIT). No tracking, no cookies, no requests to anyone.</p>
<p class="s">${t.drag} ${t.keys}</p>`;
