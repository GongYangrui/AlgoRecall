export type PanelPosition = {
  right: number;
  bottom: number;
};

export type PanelSize = {
  width: number;
  height: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type PanelSnapEdge = "left" | "right" | "top" | "bottom";

export const PANEL_EDGE_GAP = 12;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function clampPanelPosition(
  position: PanelPosition,
  panel: PanelSize,
  viewport: ViewportSize,
  gap = PANEL_EDGE_GAP,
): PanelPosition {
  const maxRight = Math.max(gap, viewport.width - panel.width - gap);
  const maxBottom = Math.max(gap, viewport.height - panel.height - gap);

  return {
    right: clamp(position.right, gap, maxRight),
    bottom: clamp(position.bottom, gap, maxBottom),
  };
}

export function nearestPanelEdge(
  position: PanelPosition,
  panel: PanelSize,
  viewport: ViewportSize,
): PanelSnapEdge {
  const distances: Record<PanelSnapEdge, number> = {
    left: viewport.width - position.right - panel.width,
    right: position.right,
    top: viewport.height - position.bottom - panel.height,
    bottom: position.bottom,
  };
  const edges: PanelSnapEdge[] = ["left", "right", "top", "bottom"];

  return edges.reduce((nearest, edge) => distances[edge] < distances[nearest] ? edge : nearest);
}

export function snapPanelPosition(
  position: PanelPosition,
  edge: PanelSnapEdge,
  panel: PanelSize,
  viewport: ViewportSize,
  gap = PANEL_EDGE_GAP,
): PanelPosition {
  const snapped = clampPanelPosition(position, panel, viewport, gap);
  if (edge === "left") snapped.right = viewport.width - panel.width - gap;
  else if (edge === "right") snapped.right = gap;
  else if (edge === "top") snapped.bottom = viewport.height - panel.height - gap;
  else snapped.bottom = gap;

  return clampPanelPosition(snapped, panel, viewport, gap);
}
