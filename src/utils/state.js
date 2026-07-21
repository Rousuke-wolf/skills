// 共享可变状态（避免 main.js ↔ show3D/index.js 循环引用）
export const appState = {
  currentModelIndex: 0,
  _modelHasContent: false,
}
