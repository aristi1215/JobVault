import { Stack, StackProps } from "aws-cdk-lib";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { ReceiptRuleSet, TlsPolicy } from "aws-cdk-lib/aws-ses";
import { S3 as S3Action } from "aws-cdk-lib/aws-ses-actions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

interface MailStackProps extends StackProps {
  ingestionBucket: Bucket;
  ingestionQueue: Queue;
}

export class MailStack extends Stack {
  constructor(scope: Construct, id: string, props: MailStackProps) {
    super(scope, id, props);

    props.ingestionBucket.grantPut(new ServicePrincipal("ses.amazonaws.com"));
    props.ingestionQueue.grantSendMessages(new ServicePrincipal("events.amazonaws.com"));

    const ruleSet = new ReceiptRuleSet(this, "InboundRuleSet", {
      receiptRuleSetName: "job-tracker-inbound",
    });

    ruleSet.addRule("StoreInboundAliasMail", {
      enabled: true,
      recipients: ["inbox.example.com"],
      tlsPolicy: TlsPolicy.REQUIRE,
      actions: [
        new S3Action({
          bucket: props.ingestionBucket,
          objectKeyPrefix: "incoming/",
        }),
      ],
    });
  }
}
