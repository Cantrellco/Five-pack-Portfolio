import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

// The KV-backed incremental cache is what makes `next: { revalidate }` real
// on Workers. Without it OpenNext has nowhere to store regenerated responses,
// so lib/github.ts's daily revalidation was a silent no-op and the GitHub
// numbers stayed frozen at whatever the last deploy's build fetched.
// Requires the NEXT_INC_CACHE_KV binding declared in wrangler.jsonc.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
