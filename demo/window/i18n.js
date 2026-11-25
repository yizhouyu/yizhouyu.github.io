export let lang = 'en'; export const setLang = l => { lang = l; };
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const zh = () => lang === 'zh';
export const fDate = (m, d) => zh() ? `${m}月${d}日` : `${d} ${MF[m - 1]}`;
export const fDateS = (m, d) => zh() ? `${m}月${d}日` : `${d} ${M[m - 1]}`;
export const mon = i => zh() ? String(i + 1) : M[i][0];
const p2 = v => String(v).padStart(2, '0');
export const fTime = m => { m = Math.round(m); const h = Math.floor(m / 60) % 24, q = m % 60; return zh() ? `${h}:${p2(q)}` : `${h % 12 || 12}:${p2(q)} ${h < 12 ? 'am' : 'pm'}`; };
export const fHour = h => zh() ? `${h}点` : h === 12 ? 'noon' : `${h % 12 || 12}`;
export const r5 = m => Math.round(m / 5) * 5;
export const fSpan = (a, b) => { a = r5(a); b = r5(b); const A = fTime(a), B = fTime(b); if (zh()) return `${A}–\u2060${B}`; return A.slice(-2) === B.slice(-2) ? `${A.slice(0, -3)} – ${B}` : `${A} – ${B}`; };
export const fDur = m => { m = r5(m); const h = Math.floor(m / 60), q = m % 60; if (zh()) return [...(h ? (q ? `${h}小时${q}分` : `${h}小时`) : `${q}分钟`)].join('\u2060'); return h ? (q ? `${h}\u00a0h ${q}\u00a0min` : `${h}\u00a0h`) : `${q}\u00a0min`; };
export const fLen = m => zh() ? `${m.toFixed(1)}米` : `${(m * 3.2808).toFixed(0)} feet`;
const S = {
  en: {
    ifGone: n => ` (if ${n} were gone)`, a1n: 'The rest of the day something stands in the way.', a2b: (a, b) => `At noon the sun stands ${a}° high in June, only ${b}° in December. A low sun shines in deep, and is easily hidden by a building.`, sReach: 'at 2 pm the light reaches', sDay: 'sun in a day', sPick: 'your pick', reveal: 'Rent this side', b6d: 'Do it at your next viewing: face south, arm out, stack fists on the horizon. A building higher than 2½ fists takes your noon sun in winter.', fistsN: n => `${n % 1 ? Math.floor(n) + '½' : n} fists`, noonOf: d => `${d}, noon`, noonSun: 'noon sun', gScore: (a, b) => b ? `${a} right` : '', gYes: (k, a, b) => `Right. ${k} gets ${a}, the other ${b}.`, gNo: (k, a, b) => `It is ${k}: ${a}, the other ${b}.`, gSee: 'See the score', gWhySelf: (k, d) => `${k} faces ${d}: in winter the sun is behind it nearly all day.`, gWhyOne: (k, n, d) => `In front of ${k}, ${n} is in the way for ${d}.`, gWhyMany: k => `A row of buildings in front of ${k} stands higher than the sun.`, v0: 'On 21 December this window gets no sun at all.', v1: (s, d) => `On 21 December the sun comes in ${s}, about ${d}.`, vp0: 'The same is true of nearly half of Manhattan’s windows.', vp: p => `More than ${p} % of Manhattan’s windows.`, vj: d => `On 21 June: ${d}.`, saveV: 'Save as a picture', cmp: 'Compare another', cmpT: 'Sun on 21 December', askAgain: 'Change floor or side', moreB: 'More', askFl: 'Which floor?', askSide: 'Which way does the window face?', askTap: 'Or tap a label on the building.', askParty: 'The sides not listed stand against their neighbours.', askOk: 'Show me', askOther: 'Another address',
    title: 'When does the sun come in this window?', brand: 'Window Sun', home: '← All demos', lang: '中文', theme: 'Light or dark', about: 'About', close: 'Close', next: 'Next', back: 'Back', skip: 'Skip to your own window', loading: 'Building the city…', retry: 'Try again', failed: 'The city could not be loaded.',
    room: 'Room', sky: 'View', cityv: 'City', play: 'Play the day', pause: 'Pause',
    step: n => `${n} of 6`,
    q1: 'When does the sun come in this window?', b1: d => `Today is ${d}. An office in New York, and the sun is in right now. Drag the sun left and right: when does it come in, and when does it leave?`, sIn: 'comes in', sOut: 'leaves',
    a1: d => `About ${d} of sun today, if the sky is clear. `, hint1: 'Drag the yellow sun on the bar below.', hint2: 'Drag along the year, to 21 December.', hint3: 'Tap the building that covers the white sun.', hint4: 'Drag the gold ring on the building up, or the handle on the floor scale.',
    q2: 'In December: more sun, or less?', b2: 'Drag the dot from 21 June to 21 December. Watch the light on the floor, then how long it stays.',
    a2: 'In December the light reaches deeper, but it stays only this long.',
    q3: 'Who takes the light?', b3: 'Now look out of the window. The white dot is the sun, hidden. Tap the building it is hiding behind.', sWith: 'sun on 21 Dec', sGone: 'without it',
    a3: (n, g) => `${cap(n)} costs this window ${g} on that day. One tall building to the south is enough.`, put: 'Put it back', lift: n => `Lift ${n} away`, liftS: 'Lift it away', wrong: (n, g) => `Not ${n}. Find the white sun: which building covers it?`,
    q4: 'Would a higher floor help?', b4: n => `Drag the gold ring on the building up to floor ${n}, the top.`, a4g: d => `It helps: ${d} more. Going up clears the low roofs across the street. But the Empire State Building is too tall; at noon it is still in the way.`,
    q5: 'Which side would you rent?', b5: 'Now the taker itself: the Empire State Building, floor 80, windows on four sides. You want the side with the most sun in December. Tap a side in the plan below, or a label on the tower.', a5: (w, b, ok, o, z) => `${ok ? 'Right' : 'Not that one'}. The ${w.toLowerCase()} side gets the most: ${b}.${z ? ` The ${o.toLowerCase()} side has no sun at all on ${z} days a year.` : ''}`, a5b: 'Ask which way a window faces first. Manhattan’s streets are turned 29°, so “south” here looks a little west.', side: d => d,
    q6: 'How high is the December sun?', b6a: 'You can measure the sun with your fist: at arm’s length it is about 10° wide. Stack fists from the horizon until they reach the sun.', sFist: 'fists', fist: 'Stack a fist', b6: (f, g) => `The December noon sun is only ${f} fists high. The Empire State Building is ${g} high, so it hides the sun.`,
    b6b: 'Judge a window by December: on 21 December nearly half of Manhattan’s windows get no sun at all.', b6c: 'From 3,000 random spots on this model’s walls. High, open south windows are the exception.',
    end1: 'Find your window', end2: 'Guess 5 windows', end3: 'Not in Manhattan', save: 'Save the print', link: 'Copy the link', copied: 'Link copied', linkBad: 'The window in this link was not found.', saved: 'Saved', again: 'Start again', undo: 'Undo', reset: 'Reset',
    free: 'Your window', find: 'Find', guess: 'Guess', down: 'One floor down', up: 'One floor up', noFloor: 'No window on that floor here.', ownPart: 'another part of this building', clock: 'clock change', whySelf: 'In December the sun stays behind this wall all day, or nearly.', whyOwn: 'In December mostly other parts of this same building are in the way.', away: 'Elsewhere', more: 'More', facing: d => `facing ${d}`, floor: n => `floor ${n}`, near: 'near',
    today: 'Today', none: 'No sun at all', noneL: 'The sun never comes in on this day.', sunOf: d => `${d} of sun`, plus: n => ` and ${n} short moment${n > 1 ? 's' : ''}`, on: d => `on ${d}`,
    jun: '21 June', dec: '21 December', avg: 'average day', taker: (n, g) => `Most in the way: ${n}. Without it, ${g} more.`, takerN: 'In December nothing single is to blame: many buildings share it.', gone: n => `This is only if ${n} were gone.`, goneK: n => `Put back ${n}`,
    capRoom: r => r ? `The light reaches ${r} into the room.` : 'No direct sun in the room now.', capSky: 'All this window sees, from left to right. Tap a building.', capCity: 'Drag to walk around. Tap any wall to look out of it.', capCityS: 'Drag to walk around.', blockNow: n => `Now in the way: ${n}.`, sunNow: 'The sun is in.', nightNow: 'The sun is down.', selfNow: 'The sun is behind this wall.',
    k: ['night', 'behind this wall', 'blocked', 'sun'], flo: 'sun on 21 Dec, by floor',
    findT: 'Find a window', findP: 'A Manhattan address, like 350 5 Ave', findH: 'Looks in the city’s list, which is part of this page. Nothing you type leaves your browser.', findNone: 'Not in this page’s list.', findAsk: 'Ask the City’s address service', findAskH: 'sends what you typed to geosearch.planninglabs.nyc', findNear: 'close by', findNo: 'The City does not know that address. Check the number and street.', findFail: 'The address service did not answer.', findOut: 'That address is outside Manhattan.', findTry: 'Or look out of one of these', findFl: 'Set the floor and the side afterwards.',
    pre: { esb: 'Empire State Building, floor 40', lib: 'Over Bryant Park', flat: 'Flatiron Building, floor 12', cit: 'Seagram Building, over Park Avenue', wall: '40 Wall Street, floor 6', eq: 'Equitable Building, floor 12' },
    g1: 'Which window gets more December sun?', whyFace: (d, q) => !q ? `This wall looks ${d}: the sun stays behind it all day.` : q[0] === 0 ? `This wall looks ${d}: the sun only comes round it at ${q[1]}.` : q[0] === 1 ? `This wall looks ${d}: from ${q[1]} on, the sun is behind it.` : q[0] === 2 ? `This wall looks ${d}: the sun is in front of it from ${q[1]} to ${q[2]}.` : `This wall looks ${d}: the sun is in front of it all day.`, whyTook: (n, d) => `${cap(n)} is in the way for ${d}.`, gB: 'This is everything two windows can see. The dashed circle is the noon sun in December. Tap the window you would take.', gNone: 'Never today', gClear: 'Clear', gCheck: 'Check', gNext: 'Next', gRes: (s, t) => `${s} points. ${t}`, gTrue: s => s ? `The sun: ${s}.` : 'The sun never comes in.', gEnd: n => `${n} of 5 right`, gEndB: 'Two questions decide a window: which way does it face, and does anything to the south stand higher than the sun?', gShare: n => `Which of two windows gets more winter sun? I got ${n} of 5.`, gHint: 'North is marked. The line is the sun’s path that day.', gAgain: 'Five more',
    aT: 'Any window, anywhere', aB: 'Set it once, read it for the whole year. One building stands opposite.', aPlace: 'City', aFace: 'The window faces', aFl: 'Your floor', aOpp: 'Building opposite', aOppN: 'none', aFloors: n => `${n} floors`, aDist: 'Distance to it', aWide: 'Its width', aNote: 'Flat ground, one building straight ahead, 10 ft per floor. Clock times follow local summer time.', aFist: (n, s) => `Noon sun on 21 ${s ? 'June' : 'December'}: ${n === 1 ? '1 fist' : (n % 1 ? (n > 1 ? Math.floor(n) : '') + '½' : n) + ' fists'} high.`, aBack: 'Back to Manhattan', away1: 'A window like yours',
    noGL: 'This browser cannot draw the room and the city (no WebGL2). The times, the year and the view still work.', lost: 'The picture was interrupted. Restoring…', party: 'There is no window here: another wall stands right against it.', roof: 'That is a roof. Tap a wall.', outside: 'Pick a wall in Manhattan.',
    printT: 'When the sun comes in', clear: 'Computed for clear skies', floors: 'Floors', lessThan: 'under 5 min',
    a1m: 'Besides that, only a few minutes in the morning; the rest of the day something stands in the way.',
    less: 'Less',
  },
  zh: {
    ifGone: n => `（假设搬走${n}）`, a1n: '其余时间外面都有东西挡着。', a2b: (a, b) => `正午的太阳，6月高${a}°，12月只有${b}°。太阳低，照得深，也更容易被楼挡住。`, sReach: '下午2点，光照进屋里', sDay: '一天有太阳', sPick: '你选', reveal: '就租这一面', b6d: '下次看房就这样做：面朝正南，伸直手臂，从地平线往上叠拳头。比2个半拳头还高的楼，冬天中午会挡住你的太阳。', fistsN: n => `${n % 1 ? Math.floor(n) + '个半' : n + '个'}拳头`, noonOf: d => `${d}，正午`, noonSun: '正午的太阳', gScore: (a, b) => b ? `对了${a}题` : '', gYes: (k, a, b) => `对了。${k}有${a}，另一扇${b}。`, gNo: (k, a, b) => `是${k}：有${a}，另一扇${b}。`, gSee: '看成绩', gWhySelf: (k, d) => `${k}朝${d}，冬天的太阳几乎整天在它背后。`, gWhyOne: (k, n, d) => `${k}前面的${n}挡了${d}。`, gWhyMany: k => `${k}前面有一片比太阳还高的楼。`, v0: '12月21日，这扇窗一点太阳也没有。', v1: (s, d) => `12月21日，${s}有太阳，约${d}。`, vp0: '曼哈顿将近一半的窗也是这样。', vp: p => `比曼哈顿${p}%的窗多。`, vj: d => `6月21日有${d}。`, saveV: '存成一张图', cmp: '再找一扇来比', cmpT: '12月21日的太阳', askAgain: '改楼层或朝向', moreB: '更多', askFl: '你在几楼？', askSide: '窗户朝哪边？', askTap: '也可以点楼上的标签。', askParty: '没列出的那几面紧贴着邻楼，没有窗。', askOk: '看结论', askOther: '换个地址',
    title: '这扇窗几点有太阳？', brand: '窗口的太阳', home: '← 全部 demo', lang: 'EN', theme: '浅色或深色', about: '说明', close: '关闭', next: '下一步', back: '上一步', skip: '直接看自己的窗', loading: '正在搭起这座城市…', retry: '再试一次', failed: '城市数据没有加载成功。',
    room: '屋里', sky: '窗外', cityv: '城市', play: '播放一天', pause: '暂停',
    step: n => `${n} / 6`,
    q1: '这扇窗几点有太阳？', b1: d => `今天是${d}。纽约的一间办公室，现在太阳正照进来。左右拖动太阳，找出它几点进来、几点离开。`, sIn: '几点进来', sOut: '几点离开',
    a1: d => `今天有太阳的时间大约${d}（天晴的话）。`, hint1: '拖下面长条上的黄色太阳。', hint2: '沿着全年图，拖到12月21日。', hint3: '点一下挡住白色太阳的那栋楼。', hint4: '把楼上的金色圆圈往上拖，或者拖楼层尺上的圆点。',
    q2: '12月，太\u2060阳\u2060变\u2060多\u2060还\u2060是\u2060变\u2060少\u2060？', b2: '把圆点从6月21日拖到12月21日。看地上的光，再看一天有多久。',
    a2: '12月的光照得更深，可一天只来这么一会儿。',
    q3: '是谁挡了光？', b3: '现在从窗口往外看。白色圆点是太阳，它被挡住了。点一下挡住它的那栋楼。', sWith: '12月21日有太阳', sGone: '没有这栋楼',
    a3: (n, g) => `${n}让这扇窗一天少晒${g}。南边有一栋高楼，就够了。`, put: '放回去', lift: n => `搬走${n}`, liftS: '搬走它', wrong: (n, g) => `不是${n}。找到白色的太阳，看是哪栋楼盖住了它。`,
    q4: '住高几层有用吗？', b4: n => `把楼上的金色圆圈往上拖，拖到最高的${n}楼。`, a4g: d => `有用，多了${d}。往上走，越过了街对面的矮楼。不过帝国大厦太高，中午还是被它挡着。`,
    q5: '你会租哪一面？', b5: '换到那栋挡光的楼：帝国大厦80楼，四面都有窗。你想要12月太阳最多的一面：点下面图里的一面，或者点楼上的标签。', a5: (w, b, ok, o, z) => `${ok ? '选对了' : '没选对'}。${w}最多，有${b}。${z ? `${o}一年有${z}天完全没有太阳。` : ''}`, a5b: '看房先问朝向。曼哈顿的街道整体转了29°，所以这里的「朝南」其实偏西一些。', side: d => `${d}面`,
    q6: '12月的太阳有多高？', b6a: '太阳有多高，可以用拳头量：伸直手臂，一个拳头大约10°。从地平线往上叠，叠到太阳为止。', sFist: '拳头', fist: '叠一个拳头', b6: (f, g) => `12月正午的太阳只有${f}高。帝国大厦有${g}高，所以它挡住了太阳。`,
    b6b: '按12月来看房：12月21日，曼哈顿将近一半的窗一点太阳也没有。', b6c: '在这个模型的墙面上随机取3000个点统计。又高又开阔的南窗是例外。',
    end1: '找自己的窗', end2: '猜5扇窗', end3: '不在曼哈顿', save: '保存这张图', link: '复制链接', copied: '链接已复制', linkBad: '没有找到这个链接里的窗。', saved: '已保存', again: '从头再来', undo: '撤销', reset: '重置',
    free: '你的窗', find: '找窗', guess: '猜一猜', down: '低一层', up: '高一层', noFloor: '这一层没有窗。', ownPart: '这栋楼自己的另一部分', clock: '调时钟', whySelf: '12月的太阳几乎整天都在这面墙的背后。', whyOwn: '12月挡光的主要是这栋楼自己的其他部分。', away: '别的城市', more: '更多', facing: d => `朝${d}`, floor: n => `${n}楼`, near: '附近',
    today: '今天', none: '全天没有太阳', noneL: '这一天一直晒不到太阳。', sunOf: d => `共晒${d}`, plus: n => `，另有${n}次很短`, on: d => d,
    jun: '6月21日', dec: '12月21日', avg: '平均每天', taker: (n, g) => `挡得最多的是${n}：没有它，能多晒${g}。`, takerN: '12月的光是很多楼一起挡的，不是哪一栋。', gone: n => `这是假设搬走${n}之后的数字。`, goneK: n => `放回${n}`,
    capRoom: r => r ? `阳光照进屋里 ${r}。` : '现在屋里没有直射的太阳。', capSky: '窗口能看到的一切，从左到右。可以点楼。', capCity: '拖动可以绕着看。点任意一面墙，就从那里往外看。', capCityS: '拖动可以绕着看。', blockNow: n => `现在挡住太阳的是${n}。`, sunNow: '太阳正照进来。', nightNow: '太阳落下去了。', selfNow: '太阳在这面墙的背后。',
    k: ['夜里', '在墙背后', '被楼挡住', '有太阳'], flo: '各楼层12月21日的太阳',
    findT: '找一扇窗', findP: '曼哈顿的地址，如 350 5 Ave', findH: '只在本页自带的地址表里找，你输入的内容不会离开浏览器。', findNone: '本页的地址表里没有。', findAsk: '向纽约市地址服务查询', findAskH: '会把你输入的内容发给 geosearch.planninglabs.nyc', findNear: '附近', findNo: '市政地址库里没有这个地址，请检查门牌和街道。', findFail: '地址服务没有回应。', findOut: '这个地址不在曼哈顿。', findTry: '也可以从这些地方往外看', findFl: '楼层和朝向，选好后再调。',
    pre: { esb: '帝国大厦40楼', lib: '布莱恩特公园边上', flat: '熨斗大厦12楼', cit: '西格拉姆大厦，公园大道边', wall: '华尔街40号6楼', eq: '公平大厦12楼' },
    g1: '哪扇窗12月太阳多？', whyFace: (d, q) => !q ? `这面墙朝${d}，太阳整天都在它背后。` : q[0] === 0 ? `这面墙朝${d}，太阳要到${q[1]}才转到它前面。` : q[0] === 1 ? `这面墙朝${d}，${q[1]}以后太阳就到它背后去了。` : q[0] === 2 ? `这面墙朝${d}，太阳从${q[1]}到${q[2]}在它前面。` : `这面墙朝${d}，太阳整天都在它前面。`, whyTook: (n, d) => `${n}挡了${d}。`, gB: '这是两扇窗能看到的一切。虚线圈是12月正午太阳的位置。点你想要的那一扇。', gNone: '今天没有', gClear: '清除', gCheck: '对答案', gNext: '下一题', gRes: (s, t) => `${s}分。${t}`, gTrue: s => s ? `有太阳：${s}。` : '一直晒不到太阳。', gEnd: n => `5题对了${n}题`, gEndB: '看一扇窗，只问两件事：朝哪边？朝南的方向上，有没有比太阳还高的楼？', gShare: n => `猜两扇窗哪扇冬天太阳多，我5题对了${n}题。`, gHint: '图上标了北。那条线是这一天太阳走的路。', gAgain: '再来5扇',
    aT: '别处的一扇窗', aB: '设一次，看一整年。对面有一栋楼。', aPlace: '城市', aFace: '窗户朝向', aFl: '你的楼层', aOpp: '对面的楼', aOppN: '没有', aFloors: n => `${n}层`, aDist: '楼间距', aWide: '它的宽度', aNote: '地面是平的，正对面一栋楼，每层3米。时间按当地钟表（含夏令时）。', aFist: (n, s) => `${s ? '6' : '12'}月21日正午，太阳高${n % 1 ? (n > 1 ? Math.floor(n) + '个半' : '半个') : n + '个'}拳头。`, aBack: '回到曼哈顿', away1: '跟你家差不多的一扇窗',
    noGL: '这个浏览器画不出房间和城市（没有 WebGL2）。时间、全年图和窗外仍然可用。', lost: '画面中断了，正在恢复…', party: '这里没有窗：另一面墙紧贴着它。', roof: '这是屋顶，请点一面墙。', outside: '请点曼哈顿的一面墙。',
    printT: '太阳进屋的时间', clear: '按晴天计算', floors: '楼层', lessThan: '不到5分钟',
    a1m: '此外早上只闪进来几分钟，其余时间外面都有东西挡着。',
    less: '收起',
  }
};
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const t = k => S[lang][k];
export const about = () => lang === 'zh' ? `
<h2>这扇窗几点有太阳？</h2>
<p>这一页替一扇窗算太阳：全年每5分钟看一次，太阳在哪里，前面有没有楼比它高。</p>
<h3>怎么算的</h3>
<p>曼哈顿的45,312栋楼，来自纽约市的三维建筑模型（2014年测量）和现在的建筑轮廓。拆掉的已经去掉；之后新建的楼用市政高度补上，其中120栋的形状来自 OpenStreetMap。</p>
<p>全年图上的两处台阶，是3月和11月调时钟。站在窗口，把每栋楼的屋顶边缘画到天空上，就得到窗外那条天际线。太阳的位置用天文公式算，和美国宇航局喷气推进实验室的数值相差不到0.02°。太阳在天际线之上，就是「有太阳」。</p>
<h3>哪里不准</h3>
<ul><li>没有云，没有树，也没有皇后区、布鲁克林和新泽西的楼。</li><li>每栋楼都当作实心，一直到地面：桥洞、脚手架和屋顶上的细东西没有算，有些塔尖画成了方块。</li><li>时间一般准到10分钟左右。楼的高度差1米，一天的开头和结尾会差几分钟；贴着楼边擦过的阳光最不准。</li><li>楼层由楼高除以层数估算。窗子取中心一个点。</li><li>「比曼哈顿百分之几的窗多」和「将近一半没有太阳」，来自在这个模型的墙面上随机取的3000个点。</li><li>又高又开阔的南窗，12月的太阳可以比6月还多：冬天太阳低，直直照进来；夏天太阳高，从墙前擦过去。</li><li>房间是想象的：4.6 × 6.9米，窗宽2.3米、高1.95米。墙的颜色和窗户的花纹也是画的。</li><li>纽约没有法律保证一扇窗的阳光。1838年，纽约的法院就没有采纳英国的「古老采光权」（Parker v. Foote 案）。前面以后盖什么楼，这一页不知道。</li></ul>
<h3>拳头有多高</h3>
<p>伸直手臂，一个拳头大约10°（也有人量出8°），大人小孩都差不多，因为手大的人手臂也长。正午太阳的高度 = 90° − 纬度 + 23.4°（夏至）或 − 23.4°（冬至）。</p>
<h3>来源</h3>
<p class="src">${src()}</p>` : `
<h2>When does the sun come in this window?</h2>
<p>This page works out the sun for one window: every 5 minutes of a year, where the sun is, and whether something in front stands higher.</p>
<h3>How it is worked out</h3>
<p>45,312 Manhattan buildings, from the City's 3-D building model (a 2014 survey) and today's building footprints. What has been torn down is gone; what was built since is added with the City's heights, 120 of those with shapes from OpenStreetMap.</p>
<p>The two steps in the year print are the clock changes in March and November. Standing at the window, the edge of every roof is drawn on the sky. That gives the skyline you see under “View”. The sun's place comes from an astronomer's formula, within 0.02° of NASA JPL's figures. When the sun is above the skyline, it is in.</p>
<h3>Where it is wrong</h3>
<ul><li>No clouds, no trees, and no buildings in Queens, Brooklyn or New Jersey.</li><li>Every building is solid down to the ground: no arches, scaffolds or thin rooftop things; some spires are drawn as blocks.</li><li>Times are usually good to about 10 minutes. Three feet of height moves the start or end by a few minutes; sun that grazes the edge of a building is the least certain.</li><li>Floors are the building's height divided by its number of floors. The window is one point, its middle.</li><li>“More than x % of windows” and “nearly half get none” come from 3,000 random spots on this model’s walls.</li><li>A high, open south window can get more sun in December than in June: the low winter sun shines straight in, the high June sun slides past the wall.</li><li>The room is imagined: 15 × 23 ft, its window 7½ ft wide and 6½ ft high. Wall colours and window patterns are painted too.</li><li>No law in New York protects a window's sunlight. A New York court turned down the English “ancient lights” rule in 1838 (Parker v. Foote). What may be built in front, this page cannot know.</li></ul>
<h3>How high is a fist</h3>
<p>At arm's length a fist is about 10° (some measure 8°), for children and adults alike: bigger hands come with longer arms. The noon sun stands 90° − your latitude, plus 23.4° at midsummer, minus 23.4° at midwinter.</p>
<h3>Sources</h3>
<p class="src">${src()}</p>`;
const A = (u, s) => `<a href="${u}" target="_blank" rel="noopener">${s}</a>`;
const src = () => [A('https://www.nyc.gov/content/oti/pages/nyc-3d-model-download', 'NYC 3-D Building Model (2014)'), A('https://data.cityofnewyork.us/City-Government/BUILDING/5zhs-2jue', 'NYC Building Footprints'), A('https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks', 'NYC PLUTO'), A('https://www.openstreetmap.org/copyright', '© OpenStreetMap contributors, ODbL'), A('https://gml.noaa.gov/grad/solcalc/calcdetails.html', 'NOAA solar equations (Meeus)'), A('https://ssd.jpl.nasa.gov/horizons/', 'JPL Horizons'), A('https://earthsky.org/astronomy-essentials/sky-measurements-degrees-arc-minutes-arc-seconds/', 'EarthSky: measuring the sky with your hand'), A('https://www.courtlistener.com/?q=%22Parker+v.+Foote%22+1838', 'Parker v. Foote, 19 Wend. 309 (N.Y. 1838)'), A('https://www.nanjing.gov.cn/xxgkn/zfgb/202401/P020240129392274760617.doc', '南京市建筑日照分析技术细则 (2024)'), A('https://github.com/mapbox/earcut', 'earcut (ISC)'), 'Marcellus (OFL), ' + A('https://github.com/TrionesType/zhuque', 'Zhuque Fangsong (OFL)')].join('<br>');
