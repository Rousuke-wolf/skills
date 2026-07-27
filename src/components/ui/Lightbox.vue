<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="image-lightbox lightbox-open"
      @wheel.prevent="onWheel"
      @dblclick="onDblClick"
      @mousedown="onMouseDown"
    >
      <button class="lightbox-close" @click.stop="close">✕</button>
      <div class="lightbox-image-wrap">
        <img
          ref="imgRef"
          :src="src"
          alt="预览大图"
          :class="{ 'zoom-fit': zoom <= 1 }"
          :style="{ transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`, cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : '' }"
          @load="onImgLoad"
        />
      </div>
      <div class="lightbox-zoom-indicator" :class="{ visible: showIndicator }">
        {{ Math.round(zoom * 100) }}%
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const visible = ref(false)
const src = ref('')
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const showIndicator = ref(false)
const imgRef = ref(null)
const imgNaturalW = ref(0)
const imgNaturalH = ref(0)

let dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0
let indicatorTimer = null

// 打开
function open(url) {
  src.value = url
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  dragging.value = false
  imgNaturalW.value = 0
  imgNaturalH.value = 0
  visible.value = true
  document.body.style.overflow = 'hidden'
}

// 关闭
function close() {
  visible.value = false
  document.body.style.overflow = ''
  clearTimeout(indicatorTimer)
  showIndicator.value = false
}

function onImgLoad() {
  if (imgRef.value) {
    imgNaturalW.value = imgRef.value.naturalWidth
    imgNaturalH.value = imgRef.value.naturalHeight
  }
}

function flashIndicator() {
  showIndicator.value = true
  clearTimeout(indicatorTimer)
  indicatorTimer = setTimeout(() => { showIndicator.value = false }, 1500)
}

// 滚轮缩放
function onWheel(e) {
  const delta = e.deltaY < 0 ? 0.1 : -0.1
  const nz = Math.min(3.0, Math.max(0.25, zoom.value + delta))
  zoom.value = Math.round(nz * 100) / 100
  if (zoom.value <= 1) { panX.value = 0; panY.value = 0 }
  flashIndicator()
}

// 拖拽
function onMouseDown(e) {
  if (e.target.classList.contains('image-lightbox')) { close(); return }
  if (e.target.closest('.lightbox-close')) return
  if (zoom.value <= 1) return
  e.preventDefault()
  dragging.value = true
  dragStartX = e.clientX; dragStartY = e.clientY
  panStartX = panX.value; panStartY = panY.value
}

function onMouseMove(e) {
  if (!dragging.value) return
  panX.value = panStartX + (e.clientX - dragStartX) / zoom.value
  panY.value = panStartY + (e.clientY - dragStartY) / zoom.value
}

function onMouseUp() {
  dragging.value = false
}

// 双击切换
function onDblClick(e) {
  if (e.target.classList.contains('image-lightbox') || e.target.closest('.lightbox-close')) return
  if (zoom.value > 1.05) {
    zoom.value = 1; panX.value = 0; panY.value = 0
  } else {
    if (imgNaturalW.value && imgNaturalH.value && imgRef.value) {
      const rect = imgRef.value.getBoundingClientRect()
      const sW = imgNaturalW.value / (rect.width / zoom.value)
      const sH = imgNaturalH.value / (rect.height / zoom.value)
      zoom.value = Math.min(3.0, Math.max(0.25, Math.min(sW, sH)))
    } else {
      zoom.value = 1.5
    }
    panX.value = 0; panY.value = 0
  }
  flashIndicator()
}

// Esc 关闭
function onKeyDown(e) {
  if (e.key === 'Escape' && visible.value) close()
}

// 全局事件（组件的生命周期内绑定）
let _eventsBound = false
function _bindEvents() {
  if (_eventsBound) return
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('keydown', onKeyDown)
  _eventsBound = true
}
function _unbindEvents() {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('keydown', onKeyDown)
  _eventsBound = false
}
onMounted(() => { _bindEvents() })
onUnmounted(() => { _unbindEvents(); visible.value = false; document.body.style.overflow = '' })

// 暴露给全局（替代老的 openImagePreview / closeImagePreview）
window.openImagePreview = open
window.closeImagePreview = close
</script>
