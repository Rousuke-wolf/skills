// models.js
// ─────────────────────────────────────────────
// 所有展品数据统一在这里维护
// 新增展品：在数组末尾加一项，index 自动对应数组下标
// qwen.js 和 main.js 都从这里 import，无需手动同步
// ─────────────────────────────────────────────

export const MODELS = [
  // index 0
  {
    name: '兔儿爷',
    key: 'rabbit',
    src: './src/assets/3d-model/rabbit.glb',
    intro: `兔儿爷是北京地区极具代表性的传统民间艺术形象，也是老北京中秋民俗文化中的重要象征。
它通常被塑造成兔首人身，身披铠甲或官袍，神态威严中又带有几分可爱，既有民俗信仰色彩，
又富有浓厚的生活气息。关于兔儿爷的来历，民间普遍认为它与"玉兔"传说有关，后来在北京民俗中
逐渐演变成一种具有守护、祈福和娱乐意味的泥塑玩具。`,
  },

  // index 1
  {
    name: '狮子',
    key: 'lion',
    src: './src/assets/3d-model/lion.glb',
    intro: `狮子在中国传统文化中是驱邪镇宅的神兽象征，常见于宫殿、庙宇和民居门口。
中国石狮造型威武庄严，与西方写实风格不同，融合了大量装饰性元素，体现了中国工匠对
吉祥寓意的独特理解。`,
  },

  // 继续添加展品，复制上面格式即可，index 自动递增 ↓
  // {
  //   name: '风筝',
  //   key: 'kite',
  //   src: './src/assets/3d-model/kite.glb',
  //   intro: `...`,
  // },
]

// ─────────────────────────────────────────────
// 供 qwen.js 自动生成 heritageList，不需要手动维护
// ─────────────────────────────────────────────
export const heritageListJSON = JSON.stringify(
  MODELS.map((m, i) => ({ index: i, name: m.name, key: m.key })),
  null,
  2
)