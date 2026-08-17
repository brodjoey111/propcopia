import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("follow-up review actions expose shared Rithmic readiness recheck invalidation", () => {
  const source = readFileSync("client/src/hooks/use-follow-up-review-actions.ts", "utf8");

  assert.match(source, /revalidateRithmicReadiness/);
  assert.match(source, /const recheckRithmicReadinessMutation = useMutation/);
  assert.match(source, /revalidateRithmicReadiness\(accountId\)/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/accounts"\] \}\)/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/accounts\/rithmic-readiness"\] \}\)/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/runtime\/accounts-overview"\] \}\)/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \["\/api\/runtime\/dashboard-overview"\] \}\)/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: notificationsQueryKey \}\)/);
});
