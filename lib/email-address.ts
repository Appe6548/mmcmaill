type RecipientMailbox = {
  emailAddress: string;
};

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
