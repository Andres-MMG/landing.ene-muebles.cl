interface DraftPolicyContext {
  request?: {
    query?: Record<string, unknown>;
  };
  state?: {
    auth?: {
      strategy?: {
        name?: unknown;
      };
    };
  };
}

const requireApiTokenForDraft = (policyContext: DraftPolicyContext): boolean => {
  const status = policyContext.request?.query?.status;

  if (status === undefined || status === "published") {
    return true;
  }

  return status === "draft" && policyContext.state?.auth?.strategy?.name === "api-token";
};

export default requireApiTokenForDraft;
