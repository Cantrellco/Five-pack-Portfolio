import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';

// The KV-backed incremental cache is what makes `next: { revalidate }` real
// on Workers. Without it OpenNext has nowhere to store regenerated responses,
// so any `revalidate` on a fetch is a silent no-op and the data stays frozen
// at whatever the last deploy's build fetched.
// Requires the NEXT_INC_CACHE_KV binding declared in wrangler.jsonc.
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
