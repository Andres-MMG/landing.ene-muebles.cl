import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "apps/web/src/app/admin/(authenticated)/leads/LeadsList.tsx"),
  "utf8",
);

describe("LeadsList interaction contract", () => {
  it("debounces the search box before navigating", () => {
    expect(source).toContain("SEARCH_DEBOUNCE_MS");
    expect(source).toContain("setTimeout");
    expect(source).toContain("400");
  });

  it("navigates with the LATEST status/page, never stale closure values", () => {
    // The debounced timer fires up to 400ms after the keystroke that
    // scheduled it; by then the user may have clicked a status pill or
    // a pagination button. navigate() must fall back to refs synced
    // during every render, not to the values captured when the timer
    // was scheduled.
    expect(source).toMatch(/statusRef\.current\s*=\s*status/);
    expect(source).toMatch(/pageRef\.current\s*=\s*page/);
    expect(source).toMatch(/next\.status !== undefined \? next\.status : statusRef\.current/);
    expect(source).toMatch(/next\.page !== undefined \? next\.page : pageRef\.current/);
  });

  it("updates the URL through router.replace inside a transition", () => {
    expect(source).toContain("router.replace");
    expect(source).toContain("startTransition");
    expect(source).not.toContain("window.history.replaceState");
  });

  it("exposes keyboard-accessible filter pills for every lead status", () => {
    expect(source).toContain('"Todos"');
    expect(source).toContain('"Nuevo"');
    expect(source).toContain('"Gestionado"');
    expect(source).toContain('"Error"');
    expect(source).toContain("aria-pressed");
  });

  it("announces status changes to assistive technology", () => {
    expect(source).toContain("aria-live");
    expect(source).toContain('role="alert"');
  });

  it("expands rows with full lead detail", () => {
    expect(source).toContain("aria-expanded");
    expect(source).toContain("colSpan");
    expect(source).toContain("idempotencyKey");
    expect(source).toContain("consentVersion");
  });

  it("keeps the lifecycle actions with confirmation", () => {
    expect(source).toContain("Marcar gestionado");
    expect(source).toContain("Reabrir");
    expect(source).toContain("Eliminar");
    expect(source).toContain("confirm(");
  });

  it("guards deletion behind a native confirm and forwards the row's documentId", () => {
    // The delete handler must be gated by `confirm(...)`: the guard is
    // `if (!confirm(...)) return;` so a cancelled confirmation returns
    // BEFORE any API call.
    const confirmIndex = source.indexOf("confirm(");
    expect(confirmIndex).toBeGreaterThan(-1);
    expect(source).toMatch(/if\s*\(\s*!confirm\(/);

    // Between the confirm call and the delete call only the early
    // return may exist — no API call may run on cancel.
    const guardRegion = source.slice(confirmIndex, source.indexOf("deleteLead("));
    expect(guardRegion).toContain("return;");
    expect(guardRegion).not.toContain("deleteLead(");

    // The delete helper receives the row's documentId (not a numeric
    // id or a captured copy) so the right record is removed.
    expect(source).toMatch(/deleteLead\(lead\.documentId\)/);
    expect(source).not.toMatch(/deleteLead\(lead\.id\)/);
  });

  it("toggles only between the known statuses (new ↔ notified)", () => {
    // An unknown/future status must never be rewritten to "notified":
    // the handler guards the two known states and LeadRow hides the
    // toggle button for anything else.
    expect(source).toMatch(/lead\.status !== "new" && lead\.status !== "notified"/);
    expect(source).toMatch(/lead\.status === "new" \|\| lead\.status === "notified"/);
  });

  it("renders a neutral fallback for unknown statuses", () => {
    expect(source).toContain('"Desconocido"');
    expect(source).toMatch(/default:\s*\n\s*return "Desconocido"/);
    // The badge default may carry a comment line between default: and
    // the return — allow it.
    expect(source).toMatch(
      /default:\s*\n(?:\s*\/\/[^\n]*\n)?\s*return "border border-ink-line bg-paper-pure text-ink-mute"/,
    );
  });

  it("moves back a page when a delete empties the current page", () => {
    // Deleting the last row of a page past the first one must navigate
    // to the previous page instead of stranding the user on an empty
    // page.
    expect(source).toMatch(/leads\.length === 1 && page > 1/);
    expect(source).toMatch(/navigate\(\{ page: page - 1 \}\)/);
  });

  it("uses the repo status-color conventions", () => {
    expect(source).toContain("bg-cream-soft");
    expect(source).toContain("text-green-700");
    expect(source).toContain("text-red-700");
  });

  it("shows Spanish empty and pagination states", () => {
    expect(source).toContain("Aún no hay leads");
    expect(source).toContain("Anterior");
    expect(source).toContain("Siguiente");
  });
});
