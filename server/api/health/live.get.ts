import { getAppVersion, getLogEnvironment } from "../../utils/logger";

export default defineEventHandler(() => ({
  ok: true,
  check: "live",
  appVersion: getAppVersion(),
  environment: getLogEnvironment(),
  uptimeSeconds: Math.floor(process.uptime()),
}));
