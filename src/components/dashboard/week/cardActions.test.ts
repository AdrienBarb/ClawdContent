import { describe, expect, it } from "vitest";
import { showApproveAction } from "./cardActions";

describe("showApproveAction", () => {
  it("Publish automatically → no Approve (local draft)", () => {
    expect(showApproveAction("full_auto", false)).toBe(false);
  });

  it("Publish automatically → no Approve (committed post)", () => {
    expect(showApproveAction("full_auto", true)).toBe(false);
  });

  it("Approve first → Approve for a not-yet-committed post", () => {
    expect(showApproveAction("review", false)).toBe(true);
  });

  it("Approve first → no Approve once the post is already scheduled", () => {
    // A committed post is already on the schedule — there's nothing left to
    // approve, so it must not show an Approve CTA (only Remove).
    expect(showApproveAction("review", true)).toBe(false);
  });
});
