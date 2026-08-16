/**
 * dsh-layout —— client 半：VSCode 式布局管理器。
 *
 * - 最左侧一条细活动条：logo（顶）、插件图标（中）、设置/布局（底）
 * - 点插件图标：在左侧区域里 增/删 该插件
 * - 布局预设：左中右 / 左中 / 中右 / 中（中间对话区不变）
 * - 左右区域可各放多个插件，上下堆叠，中间分割线可拖动调高
 * - 布局/插件分配持久化（localStorage）
 */

window.__ModuleLoader__.load({
  id: 'dsh-layout',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')
    const h = React.createElement

    /* ---------- 配置 ---------- */
    const CONFIG_KEY = 'dsh.layout.config'
    const DEFAULT_CONFIG = {
      preset: 'lcr',
      left: ['sessions'],
      right: ['ws-files'],
      leftCollapsed: false,
      rightCollapsed: false,
      leftFlex: [1],
      rightFlex: [1],
    }
    const PRESETS = [
      { id: 'lcr', label: '左中右', left: true, right: true },
      { id: 'lm', label: '左中', left: true, right: false },
      { id: 'mr', label: '中右', left: false, right: true },
      { id: 'm', label: '中', left: false, right: false },
    ]
    const OPTIONS = [
      { id: 'sessions', label: '会话列表', icon: '💬' },
      { id: 'ws-files', label: '工作区文件', icon: '📁' },
      { id: 'context-panel', label: '对话上下文', icon: '🧩' },
    ]

    function loadConfig() {
      try {
        const c = Object.assign({}, DEFAULT_CONFIG, JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'))
        // 保证 flex 数组长度与插件数组一致
        if (c.leftFlex.length !== c.left.length) c.leftFlex = c.left.map(() => 1)
        if (c.rightFlex.length !== c.right.length) c.rightFlex = c.right.map(() => 1)
        return c
      } catch {
        return Object.assign({}, DEFAULT_CONFIG)
      }
    }
    function saveConfig(c) { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)) } catch {} }

    const configStore = {
      config: loadConfig(),
      listeners: new Set(),
      get() { return this.config },
      set(patch) {
        this.config = Object.assign({}, this.config, patch)
        saveConfig(this.config)
        for (const fn of [...this.listeners]) fn()
      },
      subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) },
    }
    const menuStore = {
      open: false, listeners: new Set(),
      set(v) { this.open = v; for (const fn of [...this.listeners]) fn() },
      subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) },
    }

    function useConfig() {
      const [v, setV] = React.useState(0)
      React.useEffect(() => configStore.subscribe(() => setV(x => x + 1)), [])
      return configStore.get()
    }
    function useMenu() {
      const [v, setV] = React.useState(menuStore.open)
      React.useEffect(() => menuStore.subscribe(() => setV(menuStore.open)), [])
      return v
    }

    /* ---------- 样式 ---------- */
    const S = {
      bar: {
        width: 48, flexShrink: 0, background: '#ffffff', color: '#64748b',
        borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '6px 0', minHeight: 0,
      },
      barIcon: {
        width: 36, height: 36, border: 'none', borderRadius: 8, background: 'none',
        cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      },
      barSpacer: { flex: 1 },
      region: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: '#fff' },
      regionHead: {
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px', borderBottom: '1px solid #eee', background: '#fafbfc', minHeight: 30,
      },
      addBtn: {
        flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer',
        fontSize: 14, color: '#64748b', padding: '2px 6px',
      },
      toggle: {
        flexShrink: 0, width: 22, height: 22, border: 'none', background: 'none',
        cursor: 'pointer', color: '#64748b', fontSize: 12,
      },
      stack: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' },
      paneHead: {
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
        fontSize: 11, color: '#64748b', background: '#fafbfc', borderBottom: '1px solid #f0f0f0',
      },
      paneLabel: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      remove: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#9ca3af', padding: '0 2px' },
      divider: {
        flexShrink: 0, height: 5, cursor: 'row-resize', background: '#eef1f5',
        borderTop: '1px solid #e3e6ea', display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
      overlay: { position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.2)' },
      menu: {
        position: 'fixed', left: 60, top: '50%', transform: 'translateY(-50%)',
        background: '#fff', border: '1px solid #ddd', borderRadius: 8,
        boxShadow: '0 8px 30px rgba(0,0,0,0.18)', padding: 12, zIndex: 9999, minWidth: 180,
      },
      menuTitle: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
      preset: {
        display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none',
        cursor: 'pointer', padding: '8px 10px', borderRadius: 6, fontSize: 13, color: '#1f1f1f',
      },
      sess: { padding: '4px 8px', overflow: 'auto', flex: 1, minHeight: 0 },
      sessRow: {
        padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#1f1f1f',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      },
      wsLabel: { fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '8px 0 2px' },
      hint: { padding: 8, color: '#999', fontSize: 12 },
    }

    /* ---------- 会话列表 ---------- */
    function SessionList(props) {
      const useSessions = props.useSessions
      const useWorkspaces = props.useWorkspaces
      const openSession = props.openSession
      const startSession = props.startSession
      const sessions = useSessions ? useSessions(s => s) : null
      const workspaces = useWorkspaces ? useWorkspaces(s => s) : null
      if (!sessions || !workspaces) return h('div', { style: S.hint }, '无会话数据')

      const byId = sessions.byId || {}
      const current = sessions.current
      // 可见的「根」会话：子代理(subagent)会话不进顶层（它们挂在父会话下）；空白会话仅保留当前
      const visible = (id) => {
        const s = byId[id]
        if (!s) return false
        if (s.origin === 'subagent') return false
        if (s.blank && s.id !== current) return false
        return true
      }
      const titleOf = (id) => {
        const s = byId[id]
        if (!s) return id
        return s.blank ? 'New Session' : (s.displayTitle || id)
      }

      const accounted = new Set()
      const groups = []
      for (const ws of workspaces.items || []) {
        const members = []
        for (const id of ws.sessionIds || []) {
          accounted.add(id)
          if (visible(id)) members.push(id)
        }
        groups.push({ key: ws.workspaceId || ws.path, label: ws.title || ws.path, workspaceId: ws.workspaceId, members })
      }
      const stray = (sessions.ids || []).filter(id => !accounted.has(id) && visible(id))
      if (stray.length > 0) groups.push({ key: '__ungrouped', label: '未归组', workspaceId: undefined, members: stray })

      const renderRow = (id) => {
        const active = current === id
        return h('div', {
          key: id,
          style: { ...S.sessRow, background: active ? '#eef4ff' : 'transparent', fontWeight: active ? 600 : 400 },
          onClick: () => { if (openSession) openSession(id) },
          title: id,
        }, titleOf(id))
      }

      const renderWsHead = (g) => h('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
        h('div', { style: S.wsLabel }, g.label),
        g.workspaceId !== undefined ? h('button', {
          style: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#9ca3af', padding: 0, lineHeight: 1 },
          onClick: (e) => { e.stopPropagation(); if (startSession) startSession(g.workspaceId) },
          title: '新建会话',
        }, '＋') : null,
      )

      return h('div', { style: S.sess },
        groups.map(g => h('div', { key: g.key },
          renderWsHead(g),
          g.members.map(renderRow),
        )),
      )
    }

    /* ---------- 布局菜单 ---------- */
    function LayoutMenu() {
      const open = useMenu()
      const config = useConfig()
      if (!open) return null
      return h('div', { style: S.overlay, onClick: () => menuStore.set(false) },
        h('div', { style: S.menu, onClick: (e) => e.stopPropagation() },
          h('div', { style: S.menuTitle }, '选择布局'),
          PRESETS.map(p => h('button', {
            key: p.id,
            style: { ...S.preset, background: config.preset === p.id ? '#eef4ff' : 'transparent', fontWeight: config.preset === p.id ? 600 : 400 },
            onClick: () => { configStore.set({ preset: p.id }); menuStore.set(false) },
          }, p.label)),
        ),
      )
    }

    /* ---------- 活动条 ---------- */
    function ActivityBar(props) {
      const config = useConfig()
      const toggleLeft = (id) => {
        const left = [...config.left]
        const right = [...config.right]
        const i = left.indexOf(id)
        if (i >= 0) {
          left.splice(i, 1)
        } else {
          left.push(id)
          // 去重：同一插件只在一个区域打开，加入左侧则从右侧移除
          const j = right.indexOf(id)
          if (j >= 0) right.splice(j, 1)
        }
        configStore.set({ left, right, leftFlex: left.map(() => 1), rightFlex: right.map(() => 1) })
      }
      return h('div', { style: S.bar },
        h('div', { style: { ...S.barIcon, fontSize: 16, fontWeight: 700, color: '#1f1f1f', cursor: 'default' }, title: 'DSH' }, 'D'),
        OPTIONS.filter(o => o.id !== 'sessions').map(o => h('button', {
          key: o.id,
          style: { ...S.barIcon, background: config.left.includes(o.id) ? '#3b82f6' : 'none', color: config.left.includes(o.id) ? '#fff' : '#64748b' },
          onClick: () => toggleLeft(o.id),
          title: o.label,
        }, o.icon)),
        h('div', { style: S.barSpacer }),
        h('button', { style: S.barIcon, onClick: () => menuStore.set(true), title: '布局' }, '🎛'),
        h('button', { style: S.barIcon, title: '设置（由侧栏底部提供）' }, '⚙'),
      )
    }

    /* ---------- 区域（左/右，可多插件堆叠 + 分割） ---------- */
    function Region(props) {
      const side = props.side
      const renderSlot = props.renderSlot
      const useSessions = props.useSessions
      const useWorkspaces = props.useWorkspaces
      const openSession = props.openSession
      const startSession = props.startSession
      const wide = props.wide !== false
      const config = useConfig()
      const plugins = side === 'left' ? config.left : config.right
      const flexes = side === 'left' ? config.leftFlex : config.rightFlex
      const collapsed = side === 'left' ? config.leftCollapsed : config.rightCollapsed
      const slotKey = side === 'left' ? 'layout.left' : 'layout.right'

      const setFlex = (idx, v) => {
        const f = [...flexes]
        f[idx] = v
        configStore.set(side === 'left' ? { leftFlex: f } : { rightFlex: f })
      }
      const onDivider = (idx, e) => {
        e.preventDefault()
        const startY = e.clientY
        const a0 = flexes[idx] || 1
        const b0 = flexes[idx + 1] || 1
        const total = a0 + b0
        const move = (ev) => {
          const delta = (startY - ev.clientY) / 120
          let a = Math.max(0.3, a0 + delta)
          let b = total - a
          if (b < 0.3) { b = 0.3; a = total - b }
          const f = [...flexes]
          f[idx] = a; f[idx + 1] = b
          configStore.set(side === 'left' ? { leftFlex: f } : { rightFlex: f })
        }
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
      }
      const onToggle = () => configStore.set(side === 'left' ? { leftCollapsed: !collapsed } : { rightCollapsed: !collapsed })
      const onRemove = (pid) => {
        const arr = plugins.filter(x => x !== pid)
        const flex = arr.map(() => 1)
        configStore.set(side === 'left' ? { left: arr, leftFlex: flex } : { right: arr, rightFlex: flex })
      }
      // 添加插件到本区域，并从另一侧移除（避免同一插件重复打开）
      const addToSide = (id) => {
        const c = configStore.get()
        const left = [...c.left]
        const right = [...c.right]
        const target = side === 'left' ? left : right
        const other = side === 'left' ? right : left
        if (!target.includes(id)) {
          target.push(id)
          const j = other.indexOf(id)
          if (j >= 0) other.splice(j, 1)
        }
        configStore.set({ left, right, leftFlex: left.map(() => 1), rightFlex: right.map(() => 1) })
      }
      const occupied = new Set([...config.left, ...config.right])
      const available = OPTIONS.filter(o => (o.id !== 'sessions' || side === 'left') && !occupied.has(o.id))

      const renderPane = (pid) => {
        const opt = OPTIONS.find(o => o.id === pid)
        const label = opt ? opt.label : pid
        let content = null
        if (pid === 'sessions') content = h(SessionList, { useSessions, useWorkspaces, openSession, startSession })
        else if (renderSlot) content = renderSlot(slotKey, {}, { only: pid })
        return h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' } },
          h('div', { style: S.paneHead },
            h('span', { style: S.paneLabel }, (opt ? opt.icon : '') + ' ' + label),
            h('button', { style: S.remove, onClick: () => onRemove(pid), title: '移除' }, '✕'),
          ),
          content,
        )
      }

      const body = collapsed ? null : h('div', { style: S.stack },
        plugins.map((pid, i) => {
          const items = [h('div', { key: pid, style: { flex: (flexes[i] || 1), minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }, renderPane(pid))]
          if (i < plugins.length - 1) items.push(h('div', { key: 'd' + i, style: S.divider, onMouseDown: (e) => onDivider(i, e), title: '拖动调整高度' }, h('span', { style: { color: '#b6bcc6', fontSize: 10 } }, '≡')))
          return items
        }),
      )

      return h('div', { style: S.region },
        h('div', { style: S.regionHead },
          h('span', { style: { flex: 1, fontSize: 12, color: '#64748b', fontWeight: 600 } }, side === 'left' ? '左侧' : '右侧'),
          h('select', {
            value: '',
            onChange: (e) => { if (e.target.value) addToSide(e.target.value) },
            style: { fontSize: 12, padding: '2px 4px', maxWidth: 110 },
            title: '添加插件到此区域',
          },
            h('option', { value: '' }, '＋ 添加'),
            available.map(o => h('option', { key: o.id, value: o.id }, o.label)),
          ),
          h('button', { style: S.toggle, onClick: onToggle, title: collapsed ? '展开' : '折叠' }, collapsed ? '▸' : '▾'),
        ),
        body,
      )
    }

    /* ---------- 插件主体 ---------- */
    const name = 'dsh-layout'
    const inject = ['slots', 'layout', 'sessions', 'workspaces']

    function apply(ctx) {
      const openSession = (id) => { try { ctx.sessions.open(id) } catch { /* ignore */ } }
      const startSession = (workspaceId) => { try { ctx.workspaces.startSession(workspaceId) } catch { /* ignore */ } }

      let sidebarOpen = true
      let retries = 0
      const applyPreset = () => {
        const c = configStore.get()
        const p = PRESETS.find(x => x.id === c.preset) || PRESETS[0]
        let wired = true
        try {
          if (p.right) ctx.layout.openDetails()
          else ctx.layout.closeDetails()
          if (p.left !== sidebarOpen) {
            ctx.layout.toggleSidebar()
            sidebarOpen = p.left
          }
        } catch {
          wired = false
        }
        // 根入口（AppFrame）首屏渲染前 layout 面板动作尚未接线，openDetails 会抛
        // “panel actions not wired”。这里重试直到接线成功，确保刷新后按预设恢复列。
        if (!wired && retries < 60) {
          retries++
          setTimeout(applyPreset, 100)
        } else if (wired) {
          retries = 0
        }
      }

      // 布局菜单
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'dsh-layout-menu',
      }, LayoutMenu))

      // 左侧浏览区 = 活动条 + 左区域
      ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
        name: 'sidebar.workspaces',
        priority: -1,
        children: { 'layout.left': { kind: 'list', scope: 'session' } },
        inject: () => ({ openSession, startSession }),
      }, (p) => h('div', { style: { flex: 1, display: 'flex', minHeight: 0, minWidth: 0 } },
        h(ActivityBar),
        h(Region, { ...p, side: 'left' }),
      )))

      // 右侧 = 右区域
      ctx.slots.inject('details', () => ctx.slots.register({
        name: 'details',
        priority: -1,
        children: { 'layout.right': { kind: 'list', scope: 'session' } },
        inject: () => ({ openSession, startSession }),
      }, (p) => h(Region, { ...p, side: 'right' })))

      ctx.effect(() => {
        const t = setTimeout(applyPreset, 0)
        const unsub = configStore.subscribe(applyPreset)
        return () => { clearTimeout(t); unsub(); retries = 60 }
      }, 'dsh-layout: preset')
    }

    module.exports = { name, inject, apply }
    return module.exports
  },
})
