import assert from "node:assert/strict";
import test from "node:test";

import { findRecipientMailbox } from "./email-address.ts";

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
