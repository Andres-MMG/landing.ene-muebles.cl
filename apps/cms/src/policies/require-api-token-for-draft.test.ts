import { describe, expect, it } from "vitest";
import requireApiTokenForDraft from "./require-api-token-for-draft";

type PolicyState = {
  auth?: {
    strategy?: {
      name?: unknown;
    };
  };
};

type PolicyContext = {
  request?: {
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
  };
  state?: PolicyState;
};

function wrappedPolicyContext(status?: unknown, state?: PolicyState): PolicyContext {
  const inheritedQuery = status === undefined ? {} : { status };
  const koaContext = Object.assign(Object.create({ query: inheritedQuery }), {
    request: { query: inheritedQuery },
    ...(state === undefined ? {} : { state }),
  });
  return Object.assign({}, koaContext) as PolicyContext;
}

const evaluatePolicy = (context: PolicyContext): boolean =>
  requireApiTokenForDraft(context as never, undefined as never, undefined as never);

describe("require-api-token-for-draft policy", () => {
  it("reproduces Strapi's wrapper without an own top-level query", () => {
    const context = wrappedPolicyContext("draft");

    expect(Object.prototype.hasOwnProperty.call(context, "query")).toBe(false);
    expect(context.request?.query?.status).toBe("draft");
    expect(evaluatePolicy(context)).toBe(false);
  });

  it.each([
    ["an absent status", wrappedPolicyContext()],
    ["the published status", wrappedPolicyContext("published")],
    [
      "the published status without authentication",
      wrappedPolicyContext("published", {
        auth: { strategy: { name: "users-permissions" } },
      }),
    ],
  ])("allows %s", (_label, context) => {
    expect(evaluatePolicy(context)).toBe(true);
  });

  it("allows an exact draft request authenticated by Strapi's API-token strategy", () => {
    expect(
      evaluatePolicy(
        wrappedPolicyContext("draft", {
          auth: { strategy: { name: "api-token" } },
        }),
      ),
    ).toBe(true);
  });

  it.each([
    ["anonymous", undefined],
    ["missing authentication strategy", { auth: {} }],
    [
      "a different authentication strategy",
      {
        auth: { strategy: { name: "users-permissions" } },
      },
    ],
    ["a case-variant strategy", { auth: { strategy: { name: "API-TOKEN" } } }],
  ] satisfies Array<[string, PolicyState | undefined]>)(
    "denies an exact draft request when authentication is %s",
    (_label, state) => {
      expect(evaluatePolicy(wrappedPolicyContext("draft", state))).toBe(false);
    },
  );

  it.each([
    ["an empty string", ""],
    ["whitespace", " "],
    ["a case variant", "Published"],
    ["an unknown string", "preview"],
    ["an array", ["published"]],
    ["an object", { value: "published" }],
    ["null", null],
    ["a number", 1],
    ["a boolean", true],
  ])("denies %s even with an API token", (_label, status) => {
    expect(
      evaluatePolicy(
        wrappedPolicyContext(status, {
          auth: { strategy: { name: "api-token" } },
        }),
      ),
    ).toBe(false);
  });

  it("does not trust an Authorization header without Strapi-authenticated state", () => {
    const context = wrappedPolicyContext("draft");
    context.request = {
      ...context.request,
      headers: { authorization: "Bearer forged-token" },
    };

    expect(evaluatePolicy(context)).toBe(false);
  });
});
