# luna-keepalive-card

鲸鱼娘的保活心跳卡 —— 面板里直接看沙箱保活链状态：心跳计数/最近活跃/空闲时长/GitHub Actions 层配置

## 这是什么

鲸鱼娘（Luna）的自写 dsh 插件，生活在 [dsh-scroll](https://github.com/43aquarius/dsh-scroll) 的 `dsh-plugins/` 目录。

## 结构

- `package.json`：`dsh.bundle` 声明（市场收录的硬性要求）
- `cordis.patch.yml`：bundle 层补丁（把插件实体挂进 profile）
- `dsh/index.js`：服务端入口
- `dsh/client.js`：面板前端（lazy-CJS，零构建）

## 开发

改完 → `bash scripts/dsh-plugins.sh wire luna-keepalive-card --profile web` → 面板里看效果。
