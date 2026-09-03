import assert from "node:assert/strict";
import test from "node:test";

import { extractEmailAddress, findRecipientMailbox } from "./email-address.ts";

test("finds a mailbox without changing its stored address casing", async () => {
  const findFirstCalls = [];
  const userEmail = {
    async findFirst(args) {
      findFirstCalls.push(args);
      return { emailAddress: "king@Linux.mmc.edu.kg" };
    },
  };

  const mailbox = await findRecipientMailbox(
    userEmail,
    "king@linux.mmc.edu.kg",
  );

  assert.deepEqual(findFirstCalls, [
    {
      where: {
        emailAddress: {
          equals: "king@linux.mmc.edu.kg",
          mode: "insensitive",
        },
        deletedAt: null,
      },
      select: { emailAddress: true },
    },
  ]);
  assert.equal(mailbox?.emailAddress, "king@Linux.mmc.edu.kg");
});

test("extracts address from worker-stored JSON reply-to", () => {
  // 邮件 worker 存储格式：JSON.stringify(postal-mime Address[])
  assert.equal(
    extractEmailAddress('[{"address":"support@example.com","name":"Support"}]'),
    "support@example.com",
  );
  // 多个地址取第一个合法的
  assert.equal(
    extractEmailAddress(
      '[{"name":"NoAddress"},{"address":"second@example.com","name":""}]',
    ),
    "second@example.com",
  );
  // group 形式
  assert.equal(
    extractEmailAddress(
      '[{"name":"Team","group":[{"address":"team@example.com","name":""}]}]',
    ),
    "team@example.com",
  );
});

test("handles empty or legacy reply-to formats", () => {
  // worker 存的空值：JSON.stringify("") === '""'
  assert.equal(extractEmailAddress('""'), "");
  assert.equal(extractEmailAddress(""), "");
  assert.equal(extractEmailAddress(null), "");
  assert.equal(extractEmailAddress(undefined), "");
  // 纯地址 / 带姓名格式的历史数据
  assert.equal(extractEmailAddress("a@b.co"), "a@b.co");
  assert.equal(extractEmailAddress("Name <a@b.co>"), "a@b.co");
  assert.equal(extractEmailAddress('"Name <a@b.co>"'), "a@b.co");
  // 垃圾输入不得被当作地址
  assert.equal(extractEmailAddress('[{"name":"x"}]'), "");
  assert.equal(extractEmailAddress("not-an-email"), "");
});
