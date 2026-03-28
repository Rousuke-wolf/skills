window.switchDemo = function (index) {
  // 可扩展：根据选中针法/类型切换卡片高亮或动画强度
  console.log('切换演示组合:', index)
  // 示例：高亮对应卡片
  const cards = document.querySelectorAll('.demo-card');
  cards.forEach((c, i) => {
    c.classList.toggle('active-demo', i === index);
  })
}

window.highlightCard = function (el) {
  document.querySelectorAll('.demo-card').forEach(c => c.classList.remove('active-demo'));
  el.classList.add('active-demo')
}
