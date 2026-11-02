import { describe, expect, it } from "vitest";
import { labelBox, placeLabels, type LabelItem } from "./matrix-labels";

const overlap = (a: ReturnType<typeof labelBox>, b: ReturnType<typeof labelBox>) =>
  a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

describe("placeLabels", () => {
  it("gives every stakeholder a label, even with low influence", () => {
    const items: LabelItem[] = [
      { id: "a", x: 400, y: 300, r: 4, text: "Digital Affairs" },
      { id: "b", x: 200, y: 100, r: 9, text: "MND" },
    ];
    expect([...placeLabels(items, 800, 500).keys()].sort()).toEqual(["a", "b"]);
  });

  it("keeps labels apart when stakeholders sit on the same spot", () => {
    const items: LabelItem[] = ["NCSIST", "ROC Army", "ROC Navy", "Coast Guard"].map((text, i) => ({ id: `n${i}`, x: 500, y: 150, r: 6, text }));
    const placed = placeLabels(items, 800, 500);
    const boxes = items.map((it) => labelBox(it, placed.get(it.id)!));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
  });

  it("keeps names off the quadrant titles", () => {
    const title = { x1: 250, x2: 340, y1: 380, y2: 394 };
    const it0: LabelItem = { id: "j", x: 300, y: 387, r: 4, text: "JC Tech" };
    const box = labelBox(it0, placeLabels([it0], 400, 400, [title]).get("j")!);
    expect(overlap(box, title)).toBe(false);
  });

  it("keeps labels inside the chart near the right edge", () => {
    const it0: LabelItem = { id: "r", x: 780, y: 200, r: 6, text: "Allies near the edge" };
    const box = labelBox(it0, placeLabels([it0], 800, 500).get("r")!);
    expect(box.x2).toBeLessThanOrEqual(800);
    expect(box.x1).toBeGreaterThanOrEqual(0);
  });
});
