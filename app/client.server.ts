import Cloudflare from "cloudflare";

let apiKey = process.env.CLOUDFLARE_TOKEN;
export let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

export const client = new Cloudflare({
  apiToken: apiKey,
});
