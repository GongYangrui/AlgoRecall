import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { userRoleFieldConfig } from "@shared/auth-fields";
import { db } from "../db";
import * as authSchema from "../db/auth-schema";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: (process.env.TRUSTED_ORIGINS || process.env.BETTER_AUTH_URL || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
  },
  user: {
    additionalFields: {
      role: userRoleFieldConfig,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (adminEmails.includes(user.email.toLowerCase())) {
            return {
              data: { ...user, role: "admin" },
            };
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && ctx.body?.password) {
        const { password } = ctx.body as { password: string };
        if (password.length < 8) {
          throw new APIError("BAD_REQUEST", {
            message: "密码长度不能少于 8 位",
            code: "PASSWORD_TOO_SHORT",
          });
        }
        if (!/[A-Z]/.test(password)) {
          throw new APIError("BAD_REQUEST", {
            message: "密码必须包含至少一个大写字母",
            code: "PASSWORD_MISSING_UPPERCASE",
          });
        }
        if (!/[a-z]/.test(password)) {
          throw new APIError("BAD_REQUEST", {
            message: "密码必须包含至少一个小写字母",
            code: "PASSWORD_MISSING_LOWERCASE",
          });
        }
        if (!/[0-9]/.test(password)) {
          throw new APIError("BAD_REQUEST", {
            message: "密码必须包含至少一个数字",
            code: "PASSWORD_MISSING_DIGIT",
          });
        }
      }
    }),
  },
});
