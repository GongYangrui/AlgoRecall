# 管理后台设置指南

## 访问管理后台

访问 `/admin` 即可看到错误日志后台。只有 `role = 'admin'` 的用户可以访问。

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

## 日志查看

### 方式一：管理页面

登录 admin 用户后访问 `/admin`：
- **错误总览**：用户数、题目数、复习数、24h 错误数、数据库状态、app uptime、最近 10 条错误
- **错误日志**：按 level / event / route / statusCode / requestId / 时间范围过滤，点击展开查看 stack trace

### 方式二：stdout / Docker logs

所有日志同时输出到 stdout（JSON 格式），生产环境可以用：

```bash
docker compose logs -f app
```

即使数据库挂了，stdout 日志依然可用。

## 日志保留策略

`app_events` 表会持续增长，建议定期清理：

```bash
# 删除 30 天前的日志
node scripts/cleanup-app-events.mjs 30

# 保留 7 天
node scripts/cleanup-app-events.mjs 7
```

可以在 cron 中设置定期执行，或在 docker-compose 中添加定时任务。

## 日志字段说明

| 字段 | 说明 |
|------|------|
| `level` | `error` / `warn` / `info` / `audit` |
| `event` | 事件标识，如 `review.submit_failed`、`server.unhandled_error` |
| `message` | 错误消息 |
| `errorStack` | 完整堆栈跟踪 |
| `requestId` | 请求 ID，可在响应头 `x-request-id` 中找到 |
| `userId` | 操作用户 ID |
| `route` | 接口路径 |
| `statusCode` | HTTP 状态码 |
| `durationMs` | 请求耗时（毫秒） |

## 安全注意事项

- 日志已脱敏：`password`、`token`、`cookie`、`secret`、`authorization` 等字段不会出现在日志中
- 只有 admin 角色可以访问 `/api/admin/*` 和 `/admin` 页面
- 安全边界以服务端 middleware 为准，前端仅做 UI 隐藏
