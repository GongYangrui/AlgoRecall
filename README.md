# AlgoRecall

## Chrome 扩展（开发者模式）

扩展源码位于 `extension/`，与网站共用仓库但独立构建：

```bash
npm install
npm run extension:build:dev  # 连接 http://localhost:3000
npm run extension:build      # 连接 https://algorecall.rayspace.top
```

在 Chrome 打开 `chrome://extensions`，启用“开发者模式”，选择“加载已解压的扩展程序”，然后选择 `extension/dist/`。开发版和生产版会分别生成只允许对应 AlgoRecall 地址的最小权限清单。

扩展只在 `leetcode.cn/problems/*` 与 `leetcode.com/problems/*` 运行。它不读取网站 Cookie、LeetCode 编辑器或提交内容，连接令牌也不会暴露给题目页脚本。

把刷过的算法题变成可持续复习节奏的个人题库。

AlgoRecall 是一个面向算法学习者的复习系统：导入 LeetCode 题目，按记忆阶段安排下一次复习，记录每次卡住的原因，并用题单和统计面板帮你长期跟进薄弱点。

## Features

- 今日复习队列：按到期时间推进题目，一键记录「顺利做出 / 卡住了 / 看了题解 / 已掌握」。
- LeetCode 导入：支持题号、英文标题、中文标题、标签搜索，并识别已导入题目。
- 精选题单：内置 Top 100 Liked、Top Interview 150、NeetCode 150 等题单，可按每日数量逐步加入。
- 复习笔记：每次复习都能记录可选备注，支持安全 Markdown 渲染。
- 统计看板：查看 6 个月热力图、30 天趋势、记忆阶段分布和薄弱标签。
- 管理后台：内置运行概览、日志、错误与产品分析数据。
- 上线硬化：PostgreSQL 事务、幂等复习提交、乐观锁、Redis 限流、健康检查与 Docker 部署脚本。

## Tech Stack

- Nuxt 4, Vue 3, TypeScript
- Tailwind CSS 4, daisyUI 5, lucide-vue
- Better Auth
- Drizzle ORM, PostgreSQL
- Redis, Docker Compose, Nginx
- Vitest, Nuxt typecheck

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Docker 部署：

```bash
cp .env.example .env
./start.sh up
```

正式服务器部署使用生产安全配置，并自动完成镜像构建、数据库迁移、服务启动和健康检查：

```bash
./start.sh deploy
```

`up`、`deploy` 和 `restart` 会在应用启动前增量同步 PostgreSQL 题目索引；只有新增、变化或已删除的题目会写入数据库。

默认访问地址是 `http://localhost:3000`。生产环境请把 `BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`TRUSTED_ORIGINS`、PostgreSQL 和 Redis 连接信息换成真实配置。当前版本不发送邮件，注册后可直接登录，也不提供密码找回。

## Scripts

```bash
npm run dev          # 本地开发
npm run typecheck    # Nuxt + TypeScript 检查
npm run test         # Vitest
npm run build        # 生产构建
npm run ci           # typecheck + test + build
npm run extension:ci # 扩展类型检查 + 测试 + 正式构建
npm run db:migrate   # 迁移前安全检查 + Drizzle 迁移
npm run db:check-leetcode-source # 校验内置题库数据
npm run db:sync-leetcode         # 同步 PostgreSQL 题目索引
```

## Deployment

项目包含一键脚本：

```bash
./start.sh up
./start.sh deploy
./start.sh logs app
./start.sh admin you@example.com
./start.sh migrate
./start.sh cleanup 30
./start.sh sync-leetcode
```
