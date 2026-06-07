// Convex validates Clerk-issued JWTs using this config.
// CLERK_JWT_ISSUER_DOMAIN is set on the Convex deployment
// (https://loving-treefrog-59.clerk.accounts.dev) and is the issuer of the
// Clerk JWT template named "convex". Without this, getUserIdentity() is null.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
