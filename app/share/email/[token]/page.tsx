import { constructMetadata } from "@/lib/utils";
import SharedEmailInbox from "@/components/email/SharedEmailInbox";

export const metadata = constructMetadata({
  title: "Shared Email Inbox",
  description: "Read-only shared email inbox.",
  noIndex: true,
});

export default function SharedEmailPage({
  params,
}: {
  params: { token: string };
}) {
  return <SharedEmailInbox token={params.token} />;
}
