type RecipientMailbox = {
  emailAddress: string;
};

type ParsedAddress = {
  address?: string;
  name?: string;
  group?: ParsedAddress[];
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 从邮件的 Reply-To（或类似）字段中提取纯邮箱地址。
 *
 * 邮件 worker（cf-email-forwarding-worker）存的是 JSON 字符串：
 * - 无 Reply-To 时为 '""'
 * - 有 Reply-To 时为 '[{"address":"a@b.c","name":"X"}]'（postal-mime Address 数组，可能含 group）
 * 同时兼容纯地址或 `Name <a@b.c>` 格式的历史数据。
 * 提取不到合法地址时返回空字符串。
 */
export function extractEmailAddress(raw?: string | null): string {
  if (!raw) return "";

  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    // 不是 JSON：按原始字符串处理
  }

  if (Array.isArray(value)) {
    const flattened = (value as ParsedAddress[]).flatMap((entry) =>
      Array.isArray(entry?.group) ? entry.group : [entry],
    );
    for (const entry of flattened) {
      const address =
        typeof entry?.address === "string" ? entry.address.trim() : "";
      if (EMAIL_REGEX.test(address)) return address;
    }
    return "";
  }

  if (typeof value !== "string") return "";

  const cleaned = value.trim();
  const match = cleaned.match(/<([^<>\s]+@[^<>\s]+)>/);
  const address = (match ? match[1] : cleaned).trim();
  return EMAIL_REGEX.test(address) ? address : "";
}

type UserEmailLookup = {
  findFirst(args: {
    where: {
      emailAddress: {
        equals: string;
        mode: "insensitive";
      };
      deletedAt: null;
    };
    select: { emailAddress: true };
  }): Promise<RecipientMailbox | null>;
};

type ParsedHeader = {
  key?: string;
  value?: string;
};

/**
 * 从 worker 存储的 headers JSON（postal-mime Header[]）中提取 From 头的邮箱地址。
 *
 * SMTP 信封发件人可能是发送服务的弹回地址（如 Resend/SES 的
 * `0106...@send.example.com`），展示与回复应以 From 头为准。
 * 提取不到时返回空字符串。
 */
export function extractHeaderFromAddress(headersJson?: string | null): string {
  if (!headersJson) return "";

  let headers: unknown;
  try {
    headers = JSON.parse(headersJson);
  } catch {
    return "";
  }
  if (!Array.isArray(headers)) return "";

  const fromHeader = (headers as ParsedHeader[]).find(
    (header) =>
      typeof header?.key === "string" && header.key.toLowerCase() === "from",
  );
  return extractEmailAddress(fromHeader?.value);
}

export async function findRecipientMailbox(
  userEmail: UserEmailLookup,
  recipient: string,
) {
  return userEmail.findFirst({
    where: {
      emailAddress: {
        equals: recipient.trim(),
        mode: "insensitive",
      },
      deletedAt: null,
    },
    select: { emailAddress: true },
  });
}
