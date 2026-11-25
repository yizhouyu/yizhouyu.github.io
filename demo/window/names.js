// well-known buildings by the City's building number (BIN) -> [en, zh]. Everything else is called by its address.
export const NAMES = {
1015862: ['the Empire State Building', '帝国大厦'],
1036156: ['the Chrysler Building', '克莱斯勒大厦'],
1090825: ['One Vanderbilt', '范德比尔特一号'],
1035381: ['Grand Central Terminal', '中央车站'],
1085630: ['the MetLife Building', '大都会人寿大厦'],
1087268: ['the Bank of America Tower', '美国银行大厦'],
1088817: ['432 Park Avenue', '公园大道432号'],
1034196: ['the Grace Building', '格雷斯大厦'],
1034194: ['the New York Public Library', '纽约公共图书馆'],
1016278: ['the Flatiron Building', '熨斗大厦'],
1076262: ['30 Rockefeller Plaza', '洛克菲勒广场30号'],
1088469: ['One World Trade Center', '世贸中心一号楼'],
1087167: ['the Woolworth Building', '伍尔沃斯大厦'],
1090180: ['Central Park Tower', '中央公园大厦'],
1088961: ['30 Hudson Yards', '哈德逊广场30号'],
1083810: ['the Metropolitan Museum', '大都会艺术博物馆'],
1001018: ['40 Wall Street', '华尔街40号'],
1088565: ['One57', 'One57'],
1036474: ['the Citigroup Center', '花旗集团中心'],
1087186: ['the New York Times Building', '纽约时报大厦'],
1036465: ['the Seagram Building', '西格拉姆大厦'],
1083875: ['the UN Secretariat', '联合国秘书处大楼'],
1016741: ['the Metropolitan Life Tower', '大都会人寿保险塔楼'],
1014387: ['One Penn Plaza', '宾州广场一号'],
1001026: ['the Equitable Building', '公平大厦'],
};
// storey height where the model's top is a spire
export const STOREY = { 1015862: 3.73, 1036156: 3.66, 1090825: 5.0, 1088469: 4.0, 1087268: 4.3, 1087167: 3.7 };
const ord = n => n + (n % 100 > 10 && n % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const W = { EAST: 'East', WEST: 'West', NORTH: 'North', SOUTH: 'South' };
export function nice(a) { if (!a) return ''; return a.trim().split(/\s+/).map((w, i, r) => /^\d+$/.test(w) && i > 0 && /^(STREET|AVENUE|PLACE|ROAD)/.test(r[i + 1] || '') ? (r[i + 1] === 'AVENUE' ? ord(+w) : ord(+w)) : /^\d+(ST|ND|RD|TH)$/.test(w) ? w.toLowerCase() : W[w] || w.charAt(0) + w.slice(1).toLowerCase()).join(' ').replace('Avenue Of The Americas', '6th Avenue').replace('Adam Clayton Powell Jr', 'A. C. Powell Jr').replace(/\bMcd/, 'McD').replace(/\bOf The\b/, 'of the').replace(/ Of /, ' of '); }

const ZA = { 'AVENUE OF THE AMERICAS': '第六大道', 'MADISON AVENUE': '麦迪逊大道', 'PARK AVENUE': '公园大道', 'PARK AVENUE SOUTH': '公园大道南', 'LEXINGTON AVENUE': '列克星敦大道', 'BROADWAY': '百老汇', 'WALL STREET': '华尔街', 'BROAD STREET': '宽街', 'CANAL STREET': '坚尼街', 'HUDSON STREET': '哈德逊街', 'CENTRAL PARK WEST': '中央公园西', 'CENTRAL PARK SOUTH': '中央公园南', 'COLUMBUS AVENUE': '哥伦布大道', 'AMSTERDAM AVENUE': '阿姆斯特丹大道', 'WEST END AVENUE': '西端大道', 'RIVERSIDE DRIVE': '河滨大道', 'HOUSTON STREET': '休斯顿街', 'VANDERBILT AVENUE': '范德比尔特大道', 'LAFAYETTE STREET': '拉法叶街', 'MERCER STREET': '默瑟街', 'GREENE STREET': '格林街', 'WATER STREET': '水街', 'FULTON STREET': '富尔顿街', 'BOWERY': '包厘街', 'GRAND STREET': '格兰街', 'BLEECKER STREET': '布利克街', 'SPRING STREET': '春街', 'PRINCE STREET': '王子街', 'BROOME STREET': '布隆街', 'DELANCEY STREET': '迪兰西街', 'GREENWICH STREET': '格林威治街', 'NASSAU STREET': '拿骚街', 'CHAMBERS STREET': '钱伯斯街', 'CENTRE STREET': '中央街', 'VARICK STREET': '瓦里克街', 'SUTTON PLACE': '萨顿广场', 'YORK AVENUE': '约克大道', 'FIFTH AVENUE': '第五大道', '12 AVENUE': '第十二大道' }, ZN = ['', '第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十', '第十一', '第十二'];
const ORDW = { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, FIFTH: 5, SIXTH: 6, SEVENTH: 7, EIGHTH: 8, NINTH: 9, TENTH: 10 };
export function niceZh(a) { const m = /^(\d+[A-Z]?(?:-\d+)?)\s+(.+)$/.exec(a.trim()); if (!m) return nice(a); let [, n, s] = m, q; if (ZA[s]) return `${ZA[s]}${n}号`; if (q = /^(EAST|WEST) (\d+)(?:ST|ND|RD|TH)? STREET$/.exec(s)) return `${q[1] === 'EAST' ? '东' : '西'}${q[2]}街${n}号`; if (q = /^(\d+)(?:ST|ND|RD|TH)? AVENUE$/.exec(s)) return ZN[+q[1]] ? `${ZN[+q[1]]}大道${n}号` : nice(a); if (q = /^([A-Z]+) AVENUE$/.exec(s)) if (ORDW[q[1]]) return `${ZN[ORDW[q[1]]]}大道${n}号`; return nice(a); }

// doors people know that the tax-lot list writes differently -> BIN
export const ALIAS = { '350 5 AVENUE': 1015862, '20 WEST 34 STREET': 1015862, '405 LEXINGTON AVENUE': 1036156, '1 VANDERBILT AVENUE': 1090825, '200 PARK AVENUE': 1085630, '30 ROCKEFELLER PLAZA': 1076262, '1 BRYANT PARK': 1087268, '175 5 AVENUE': 1016278, '285 FULTON STREET': 1088469, '1 WORLD TRADE CENTER': 1088469, '1 PENN PLAZA': 1014387, '30 HUDSON YARDS': 1088961, '225 WEST 57 STREET': 1090180 };
