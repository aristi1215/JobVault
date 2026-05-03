import { parseEmailMessage } from "../domain/parser.js";

interface QueueMessage {
  userId: string;
  sender: string;
  subject: string;
  body: string;
}

export function processParserMessage(message: QueueMessage) {
  const parsed = parseEmailMessage(message.sender, message.subject, message.body);

  return {
    userId: message.userId,
    parser: parsed.parser,
    confidence: parsed.confidence,
    status: parsed.status,
    eventType: parsed.eventType,
    classification: parsed.classification,
    extracted: parsed.extracted,
  };
}
