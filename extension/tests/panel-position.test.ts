import { describe, expect, it } from "vitest";
import { clampPanelPosition, nearestPanelEdge, snapPanelPosition } from "../src/panel-position";

const viewport = { width: 1_000, height: 800 };
const panel = { width: 300, height: 200 };

describe("panel position geometry", () => {
  it("keeps the panel inside the viewport gap", () => {
    expect(clampPanelPosition({ right: -20, bottom: 900 }, panel, viewport))
      .toEqual({ right: 12, bottom: 588 });
    expect(clampPanelPosition({ right: 900, bottom: -20 }, panel, viewport))
      .toEqual({ right: 688, bottom: 12 });
  });

  it("selects the nearest of all four viewport edges", () => {
    expect(nearestPanelEdge({ right: 680, bottom: 100 }, panel, viewport)).toBe("left");
    expect(nearestPanelEdge({ right: 20, bottom: 100 }, panel, viewport)).toBe("right");
    expect(nearestPanelEdge({ right: 200, bottom: 580 }, panel, viewport)).toBe("top");
    expect(nearestPanelEdge({ right: 200, bottom: 20 }, panel, viewport)).toBe("bottom");
  });

  it("snaps to each edge while retaining the other axis", () => {
    const position = { right: 200, bottom: 100 };
    expect(snapPanelPosition(position, "left", panel, viewport)).toEqual({ right: 688, bottom: 100 });
    expect(snapPanelPosition(position, "right", panel, viewport)).toEqual({ right: 12, bottom: 100 });
    expect(snapPanelPosition(position, "top", panel, viewport)).toEqual({ right: 200, bottom: 588 });
    expect(snapPanelPosition(position, "bottom", panel, viewport)).toEqual({ right: 200, bottom: 12 });
  });

  it("handles viewports smaller than the panel without negative offsets", () => {
    const tinyViewport = { width: 240, height: 160 };
    expect(snapPanelPosition({ right: 50, bottom: 50 }, "left", panel, tinyViewport))
      .toEqual({ right: 12, bottom: 12 });
  });

  it("keeps a snapped edge when the panel changes size", () => {
    const collapsed = { width: 120, height: 44 };
    const leftPosition = snapPanelPosition({ right: 300, bottom: 80 }, "left", collapsed, viewport);
    expect(leftPosition).toEqual({ right: 868, bottom: 80 });
    expect(snapPanelPosition(leftPosition, "left", panel, viewport))
      .toEqual({ right: 688, bottom: 80 });
  });
});
