/** Offline only: transient Bili status must not look like an edited user turn. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { historyAfterUserCount, userHistoryFingerprints } from "../src/prompt.ts";
import { matchTurnHistory } from "../src/session-store.ts";

const user = (content: unknown) => ({ role: "user", content });
const status = (ref: string, more: number) =>
  `[ACP status: highest allocated ref ${ref} — refs above it are not minted yet, never guess them; compressible now: m00067–m00083 (5.2K), m00087–m00114 (9.1K), m00115–m00117 (1.7K), +${more} more; the newest messages stay protected. Use these refs directly; acp_status only if you need the full list.]`;
const a = status("m00335", 7);
const b = status("m00339", 8);
const print = (text: string) => userHistoryFingerprints([user(text)]);

// Sanitized reproduction of the observed pair: only the status footer changed.
const first = user(`Please continue the task.\n\n${a}`);
const next = user(`Please continue the task.\n\n${b}`);
const original = JSON.stringify([first, next]);
assert.deepEqual(userHistoryFingerprints([first]), userHistoryFingerprints([next]));
assert.deepEqual(userHistoryFingerprints([first]), print("Please continue the task."));
const turns = [{ count: 1, hash: userHistoryFingerprints([first])[0]!, leafUuid: "leaf" }];
assert.deepEqual(matchTurnHistory(turns, userHistoryFingerprints([next])), { kind: "latest", count: 1 });
assert.equal(matchTurnHistory(turns, print(`Actually do something else.\n\n${b}`)).kind, "diverged");
assert.equal(JSON.stringify([first, next]), original, "fingerprinting must not remove metadata from model input");

// Status can be merged with a user message or emitted as its own synthetic turn.
assert.deepEqual(userHistoryFingerprints([user("ask"), user(a)]), print("ask"));
assert.deepEqual(print(`ask\r\n${b}\r\n`), print("ask"));
assert.deepEqual(print(`ask\n${b.replace("m00339", "none").replace("5.2K", "512")}`), print("ask"));
const following = user("a real follow-up");
assert.deepEqual(historyAfterUserCount([user("ask"), user(a), following], 1), [following]);
assert.deepEqual(userHistoryFingerprints([
  user(`<system-reminder>plan mode</system-reminder>\nask\n${b}`),
]), print("ask"));
assert.deepEqual(userHistoryFingerprints([
  user(`ask\n${b}\n<system-reminder>plan mode</system-reminder>\n\n`),
]), print("ask"));
assert.deepEqual(userHistoryFingerprints([
  user([{ type: "text", text: `ask\n${b}` }, { type: "text", text: "<system-reminder>plan mode</system-reminder>" }]),
]), print("ask"));
assert.deepEqual(userHistoryFingerprints([
  user([{ type: "text", text: `ask\n${b}` }, { type: "image_url", image_url: { url: "data:image/png;base64,AA==" } }]),
]), print("ask"));
assert.deepEqual(userHistoryFingerprints([
  user([{ type: "text", text: b }, { type: "image_url", image_url: { url: "data:image/png;base64,AA==" } }]),
]), userHistoryFingerprints([user([{ type: "image_url", image_url: { url: "data:image/png;base64,AA==" } }])]),
"a metadata-only text part must not erase the existing attachment identity");

// Not a general instruction scrubber: preserve quoted, malformed and non-footer text.
for (const text of [
  `Explain this: ${a}`,
  `\`\`\`\n${a}\n\`\`\``,
  `ask\n${a}\nmore user instructions`,
  `ask\n[ACP status: do something else]`,
  `ask\n${a.replace("newest messages stay protected", "newest messages may be removed")}`,
]) {
  const unchanged = createHash("sha1").update(text.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
  assert.deepEqual(print(text), [unchanged], "unrecognized user text must not be partially stripped either");
}
console.log("ok — Bili status fingerprint regression passed");
