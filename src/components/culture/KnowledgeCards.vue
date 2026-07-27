<template>
  <div class="culture-cards-panel">
    <div class="culture-cards-header">
      <div class="culture-cards-title">🎴 刺绣知识卡片</div>
      <div class="culture-cards-refresh" @click="refresh">🔀 换一批</div>
    </div>
    <div class="culture-mini-grid" id="cultureCardGrid">
      <div
        v-for="(c, i) in cards"
        :key="c.name + i"
        class="culture-mini-card"
        @click="quickQuestion(c.q)"
      >
        <div class="mini-card-num">0{{ i + 1 }}</div>
        <div class="mini-card-emoji">{{ c.emoji }}</div>
        <div class="mini-card-name">{{ c.name }}</div>
        <div class="mini-card-tag">{{ c.tag }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const CULTURE_CARDS = [
  { emoji:'🧵',name:'苏绣',tag:'精细雅洁 · 双面绣',q:'请详细介绍苏绣的特点和代表作品' },
  { emoji:'🦁',name:'湘绣',tag:'毛针质感 · 豪放气质',q:'请详细介绍湘绣的特点和代表作品' },
  { emoji:'🐼',name:'蜀绣',tag:'疏朗明快 · 天府风韵',q:'请详细介绍蜀绣的特点和代表作品' },
  { emoji:'🦚',name:'粤绣',tag:'饱满浓烈 · 岭南风情',q:'请详细介绍粤绣的特点和代表作品' },
  { emoji:'🌺',name:'苗绣',tag:'几何纹样 · 民族特色',q:'请介绍苗绣的历史文化和特色纹样' },
  { emoji:'🪡',name:'平针',tag:'最基础的刺绣针法',q:'什么是平针？如何操作平针？' },
  { emoji:'↩️',name:'回针',tag:'轮廓线条的常用针法',q:'什么是回针？它有什么用途？' },
  { emoji:'🔗',name:'锁边针',tag:'装饰与加固边缘',q:'请介绍锁边针的特点和使用场景' },
  { emoji:'🌸',name:'缎针',tag:'光滑填充 · 缎面效果',q:'什么是缎针？如何绣出缎面质感？' },
  { emoji:'📜',name:'非遗历史',tag:'2006年列入国家名录',q:'中国刺绣非遗的历史和保护现状是什么？' },
  { emoji:'🎨',name:'色彩搭配',tag:'刺绣配色艺术',q:'传统刺绣的色彩搭配有哪些讲究？' },
  { emoji:'✂️',name:'绣布工具',tag:'绣绷 · 绣针 · 丝线',q:'刺绣需要准备哪些基本工具和材料？' },
]

function pickRandom4() {
  return [...CULTURE_CARDS].sort(() => Math.random() - 0.5).slice(0, 4)
}

const cards = ref(pickRandom4())

function refresh() {
  cards.value = pickRandom4()
}

function quickQuestion(q) {
  if (typeof window.quickQuestion === 'function') {
    window.quickQuestion(q)
  }
}
</script>
