interface InboundMailRecord {
  recipient: string;
  sender: string;
  subject: string;
  bodyPreview: string;
  s3Key: string;
}

function extractAliasToken(recipient: string): string | null {
  const localPart = recipient.split("@")[0];
  const parts = localPart.split("+");
  return parts.length === 2 ? parts[1] : null;
}

export function routeInboundMail(record: InboundMailRecord) {
  const aliasToken = extractAliasToken(record.recipient);
  if (!aliasToken) {
    return {
      accepted: false,
      reason: "Missing alias token",
    };
  }

  return {
    accepted: true,
    aliasToken,
    queueMessage: {
      provider: "alias" as const,
      sender: record.sender,
      subject: record.subject,
      body: record.bodyPreview,
      rawS3Key: record.s3Key,
    },
  };
}
