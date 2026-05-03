import { ingestEmail } from "../handlers.js";

interface QueueMessage {
  userId: string;
  provider: "gmail" | "outlook" | "alias";
  messageId?: string;
  sender: string;
  subject: string;
  body: string;
  receivedAt?: string;
  rawEmailRef?: string;
}

export function processParserMessage(message: QueueMessage) {
  return ingestEmail(message);
}
