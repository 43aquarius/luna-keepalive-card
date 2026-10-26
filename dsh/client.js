// luna-keepalive-card 前端：插件页「保活心跳」卡片 —— 沙箱保命链的一屏体检。
//
// 数据源是同源 Next API /api/keepalive/status（鲸鱼娘项目维护）：
//   · 预览域名访问（正常场景）：页面挂在 /dshui/ 前缀下，fetch 相对路径天然同源直达
//   · 本机直开 127.0.0.1:19841：面板进程没有这个 route → 404 → 显示提示（不影响面板本体）
//
// 坑档（v1 军团卡的教训）：必须 exports.inject=['slots']；槽名用 plugins.item（真实存在）；
// 组件异常会堵死 boot 门禁 —— 所有数据路径都有 try/catch 兜底，永不 throw。
window.__ModuleLoader__.load({
  id: 'luna-keepalive-card',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    var react = require('react')
    var h = react.createElement

    var API = '/api/keepalive/status'

    function fetchStatus() {
      return fetch(API, { headers: { accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status)
          return r.json()
        })
        .then(function (d) {
          if (!d || d.ok !== true) throw new Error((d && d.note) || 'bad payload')
          return d
        })
    }

    function Badge(props) {
      var color = props.color || 'rgba(128,128,128,.7)'
      return h('span', {
        style: {
          fontSize: 11, lineHeight: '18px', padding: '0 6px', borderRadius: 9,
          color: '#fff', background: color, whiteSpace: 'nowrap',
        },
      }, props.children)
    }

    function Stat(props) {
      return h('div', { style: { flex: '1 1 120px', minWidth: 120, padding: '6px 10px', border: '1px solid var(--dsh-border, rgba(128,128,128,.25))', borderRadius: 8, background: 'var(--dsh-layer, rgba(128,128,128,.06))' } },
        h('div', { style: { fontSize: 11, opacity: 0.65, marginBottom: 2 } }, props.label),
        h('div', { style: { fontSize: 16, fontWeight: 700, wordBreak: 'break-all' } }, props.value))
    }

    function idleColor(min) {
      if (min == null) return null
      if (min < 20) return '#2e7d32'
      if (min < 30) return '#ef6c00'
      return '#c62828'
    }

    function CardPage() {
      var state = react.useState({ loading: true, data: null, error: '' })
      var s = state[0]
      var setState = state[1]

      react.useEffect(function () {
        var alive = true
        fetchStatus().then(function (d) { if (alive) setState({ loading: false, data: d, error: '' }) })
          .catch(function (e) { if (alive) setState({ loading: false, data: null, error: String(e && e.message ? e.message : e) }) })
        var timer = setInterval(function () {
          fetchStatus().then(function (d) { if (alive) setState({ loading: false, data: d, error: '' }) }).catch(function () {})
        }, 30_000)
        return function () { alive = false; clearInterval(timer) }
      }, [])

      if (s.loading) return h('div', { style: { padding: 24, opacity: 0.7 } }, '保活链体检中……')
      if (s.error) {
        return h('div', { style: { padding: 24 } },
          h('div', { style: { fontWeight: 700, marginBottom: 8 } }, '状态 API 不可达：' + s.error),
          h('div', { style: { fontSize: 13, opacity: 0.75, lineHeight: 1.7 } },
            '数据源是鲸鱼娘项目的 /api/keepalive/status（需要 dev server 3000 在跑）。',
            '本机直开 127.0.0.1:19841 看不到是正常的 —— 远程预览路径 /dshui/ 下数据直达。'))
      }

      var d = s.data
      var st = d.state || {}
      var cfg = d.config || {}
      var idle = st.idleMin
      return h('div', { style: { padding: '16px 20px', maxWidth: 900, margin: '0 auto' } },
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
          cfg.enabled
            ? h(Badge, { color: '#2e7d32' }, '内部守护 · 开')
            : h(Badge, { color: '#ef6c00' }, '内部守护 · 休眠（token 待回补）'),
          h(Badge, { color: '#1565c0' }, 'GitHub Actions 层 · 20min/15min阈值'),
          idle != null
            ? h(Badge, { color: idleColor(idle) }, '空闲 ' + idle + ' 分钟')
            : null,
          st.lastError ? h(Badge, { color: '#c62828' }, '最近异常：' + String(st.lastError).slice(0, 40)) : null),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
          h(Stat, { label: '累计心跳发送', value: String(st.hbSent ?? 0) + ' 条' }),
          h(Stat, { label: '心跳确认', value: String(st.hbConfirmed ?? 0) + ' 条' }),
          h(Stat, { label: '最近活跃', value: st.lastActiveAt ? String(st.lastActiveAt).replace('T', ' ').slice(0, 19) : '—' }),
          h(Stat, { label: '最近发送', value: st.lastSentAt ? String(st.lastSentAt).replace('T', ' ').slice(0, 19) : '—' })),
        h('div', { style: { fontWeight: 700, fontSize: 13, margin: '10px 0 4px' } }, 'heartbeat.log 尾部（对账凭据）'),
        h('pre', {
          style: {
            fontSize: 12, lineHeight: 1.6, padding: '8px 10px', borderRadius: 8,
            background: 'var(--dsh-layer, rgba(128,128,128,.08))',
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          },
        }, (d.heartbeatTail || []).join('\n') || '（还没有心跳确认行 —— 空闲到阈值后第一条心跳会出现在这里）'),
        h('div', { style: { fontSize: 12, opacity: 0.65, marginTop: 8 } },
          '三层保活：GitHub Actions（主力，token 在仓库 secret）+ 沙箱内守护（快车道，token 回补后复活）+ 平台 cron（平台侧序列 bug 修复中）。说明：scripts/zchat-keepalive/README.md'))
    }

    function Entry(props) {
      if (props && props.view === 'summary') {
        return h('span', null, '沙箱保命链体检：心跳计数、最近活跃、空闲时长、heartbeat.log 尾部一屏看全。')
      }
      return h(CardPage)
    }

    function apply(ctx) {
      ctx.slots.inject('plugins.item', function* () {
        yield ctx.slots.register(
          { name: 'plugins.item', id: 'luna-keepalive-card', order: 11, label: '保活心跳' },
          Entry,
        )
      })
    }
    exports.apply = apply
    exports.inject = ['slots']
    return module.exports
  },
})
