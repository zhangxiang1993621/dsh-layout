# dsh-layout — 布局管理器（DeepSeek Harness 插件）

VSCode 式三栏布局管理器：最左侧一条细活动条（logo + 插件图标 + 布局/设置按钮），
左右区域各自可堆叠多个插件、拖动分割线调高、可折叠，布局预设与插件分配持久化。

## 功能

- **活动条**：白色细条，顶部 logo「D」，中部插件图标（点击可在左侧区域增/删对应插件），底部布局 🎛 与设置 ⚙
- **布局预设**：左中右 / 左中 / 中右 / 中（中间对话区不变），通过 `ctx.layout` 开合左右列
- **左右区域**：`＋ 添加` 下拉把插件分配到左/右区域，同一插件只在一个区域打开（自动去重）
- **堆叠 + 拖动分割线**：一个区域内多个插件上下堆叠，分割线可拖动调整各 pane 高度
- **折叠**：左右区域可单独折叠（折叠后仅剩标题栏）
- **持久化**：布局预设、插件分配、折叠状态、各 pane 高度比例存于 `localStorage`（键 `dsh.layout.config`）

## 架构

| 半 | 文件 | 作用 |
|---|---|---|
| host | `lib/index.js` | 极简 host（`inject []`），仅提供插件元信息 |
| client | `lib/client.js` | 活动条、布局菜单、左右区域（Region）、会话列表；注册进 `sidebar.workspaces`、`details`、`shell.overlay` |
| 声明 | `package.json` | `dsh.client.inject = ["slots","layout","sessions","workspaces"]` + `exports["./client"]` |

## 槽位

- `sidebar.workspaces`（priority -1，子槽 `layout.left`）：渲染活动条 + 左侧区域
- `details`（priority -1，子槽 `layout.right`）：渲染右侧区域
- `shell.overlay`：布局预设菜单
- `layout.left` / `layout.right`：供其它插件（如 `dsh-ws-files`、`dsh-context-panel`）注册内容，由本插件渲染为可拖动的 pane

## 安装

```bash
# 在 deepseek-harness 仓库目录（开发期用 link:，改源码刷新即生效）
node --import tsx/esm apps/cli/src/bin.ts plugin --profile web add link:D:/agent-workspace/dsh-layout
```

## 说明

- 布局持久化在 `localStorage`，跨刷新保留；右侧（details）列只有在存在非空白当前会话时才渲染。
- 会话列表（sessions）只能放左侧区域；`ws-files` / `context-panel` 可在左右区域之间移动。
