import { describe, expect, it } from "vitest";
import { userRoleFieldConfig } from "../shared/auth-fields";

describe("auth field config", () => {
  it("does not allow clients to set the role field during signup", () => {
    expect(userRoleFieldConfig.input).toBe(false);
    expect(userRoleFieldConfig.defaultValue).toBe("user");
  });
});
