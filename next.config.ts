import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * A bill claim's supporting document (BR-34/NFR-11) is uploaded through a
       * Server Action, so it is the Server Action body limit — 1MB by default —
       * that decides how large an attachment can be, not the API's own cap.
       *
       * The backend accepts 10MB (`bill-claims.controller.ts`), but a serverless
       * host will not carry that: Vercel refuses a function request body over
       * 4.5MB before Next.js ever sees it. 4mb sits under that ceiling with room
       * for the boundaries and part headers multipart adds on top of the file.
       */
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
