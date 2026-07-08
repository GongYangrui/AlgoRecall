# 管理后台与日志统计设置指南

## 访问管理后台

访问 `/admin` 即可看到运营与稳定性后台。只有登录后 `role = 'admin'` 的用户可以访问。

安全边界以服务端 `/api/admin/*` 的 admin 校验为准；前端路由中间件只负责用户体验上的跳转。

## 提升用户为管理员

### 新注册用户

在 `.env` 中设置 `ADMIN_EMAILS`，注册时自动赋权：

```env
ADMIN_EMAILS=admin@example.com
```

### 已注册用户

使用提升脚本：

```bash
node scripts/promote-admin.mjs user@example.com
```

需要 `DATABASE_URL` 环境变量（本地 `.env` 已有，Docker 容器内通过 env_file 传入）。

## 后台能力

登录 admin 用户后访问 `/admin`：

- **运营总览**：今日活跃用户、近 7 日活跃用户、今日入队题目、今日复习提交、30 天趋势。
- **稳定性总览**：24h 错误数、数据库状态、app uptime、最近错误。
- **错误日志**：按 level / source / event / route / statusCode / requestId / version / 时间范围 / 关键词过滤，点击展开查看 stack trace。
- **诊断包**：日志详情可以复制精简 JSON，适合直接粘贴给排查者定位问题。

统计口径：

- 活跃用户来自 `analytics_events`，按 `user_id` 去重。
- “今日入队题目”统计题单题目进入复习队列的相关事件。
- “今日复习提交”来自 `reviews`。
- 错误日志来自 `app_events`，不与行为统计混用。

## 日志查看

### stdout / Docker logs

所有日志同时输出到 stdout（JSON 格式），生产环境可以用：

```bash
docker compose logs -f app
```

即使数据库挂了，stdout 日志依然可用。

## 保留策略

`app_events` 和 `analytics_events` 表会持续增长，默认建议保留 30 天：

```bash
# 删除 30 天前的错误日志和行为统计
node scripts/cleanup-app-events.mjs 30

# 保留 7 天
node scripts/cleanup-app-events.mjs 7
```

可以在 cron 中设置定期执行，或在 docker-compose 中添加定时任务。

## 错误日志字段说明

| 字段 | 说明 |
|------|------|
| `level` | `error` / `warn` / `info` / `audit` |
| `source` | `server` / `client` / `system` |
| `event` | 事件标识，如 `review.submit_failed`、`server.unhandled_error` |
| `message` | 错误消息 |
| `errorStack` | 完整堆栈跟踪 |
| `requestId` | 请求 ID，可在响应头 `x-request-id` 中找到 |
| `userId` | 操作用户 ID |
| `route` | 接口路径 |
| `statusCode` | HTTP 状态码 |
| `durationMs` | 请求耗时（毫秒） |
| `appVersion` | 应用版本，来自 `APP_VERSION` 或 git commit 环境变量，默认 `dev` |
| `environment` | 运行环境，来自 `NODE_ENV` |
| `metadata.operation` | 业务动作名，如 `review.submit`、`problem.create` |
| `metadata.request` | 脱敏后的请求摘要：path、query、params、userAgent、ip、referrer、contentType |

客户端错误会通过 `/api/logs/client-error` 写入 `app_events`，`source = client`，`event = client.unhandled_error`。该接口要求用户已登录。

## 行为统计字段说明

| 字段 | 说明 |
|------|------|
| `event` | 事件标识，如 `app_opened`、`study_item_started`、`review_submitted` |
| `userId` | 操作用户 ID |
| `entityType` | 关联对象类型，如 `page`、`problem`、`study_list` |
| `entityId` | 关联对象 ID |
| `route` | 触发事件的服务端 API 路径 |
| `metadata` | 事件上下文，已脱敏 |

## 安全注意事项

- 日志已脱敏：`password`、`token`、`cookie`、`secret`、`authorization` 等字段不会出现在日志中
- 不记录完整 request body，只记录必要上下文和请求摘要
- 只有 admin 角色可以访问 `/api/admin/*` 和 `/admin` 页面
- `role` 是服务端字段，注册时不允许客户端传入
