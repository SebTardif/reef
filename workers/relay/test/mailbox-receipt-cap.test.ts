import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

function mailbox(name: string) {
  return env.MAILBOX.get(env.MAILBOX.idFromName(name));
}

describe("mailbox receipt cap", () => {
  const now = Math.floor(Date.now() / 1000);

  it("queues a message after 200 receipts", async () => {
    const box = mailbox("receipts-do-not-block-messages");
    for (let index = 0; index < 200; index += 1) {
      const receipt = await box.enqueue("peer", `receipt-${index}`, "receipt", "{}", now);
      expect(receipt.result).toBe("queued");
    }
    const message = await box.enqueue("peer", "message-1", "message", "{}", now);
    expect(message.result).toBe("queued");
  });

  it("rejects a message once 200 messages are queued", async () => {
    const box = mailbox("messages-still-cap-at-200");
    for (let index = 0; index < 200; index += 1) {
      const message = await box.enqueue("peer", `message-${index}`, "message", "{}", now);
      expect(message.result).toBe("queued");
    }
    const extra = await box.enqueue("peer", "message-200", "message", "{}", now);
    expect(extra.result).toBe("capacity");
  });

  it("drops the oldest receipt instead of rejecting a new one", async () => {
    const box = mailbox("receipts-evict-oldest");
    for (let index = 0; index < 200; index += 1) {
      const receipt = await box.enqueue("peer", `receipt-${index}`, "receipt", "{}", now);
      expect(receipt.result).toBe("queued");
    }
    const extra = await box.enqueue("peer", "receipt-200", "receipt", "{}", now);
    expect(extra.result).toBe("queued");
    const pulled = (await box.pull(0)) as {
      entries: Array<{ id: string; kind: "message" | "receipt" }>;
    };
    const receipts = pulled.entries.filter((entry) => entry.kind === "receipt");
    expect(receipts).toHaveLength(200);
    expect(pulled.entries).toHaveLength(200);
    expect(pulled.entries.some((entry) => entry.id === "receipt-0")).toBe(false);
    expect(pulled.entries.at(-1)?.id).toBe("receipt-200");
  });
});
