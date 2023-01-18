import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { AccountPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as iam from 'aws-cdk-lib/aws-iam';

export class SqsSnsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'SqsSnsQueue', {
      visibilityTimeout: Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'SqsSnsTopic');

    topic.addSubscription(new subs.SqsSubscription(queue));

    const myLambda = new NodejsFunction(this, 'cdkWorkshopMyLambda', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'main',
      entry: path.join(__dirname, `../lambda/sms.ts`),
      environment: {
        TOPIC_ARN: topic.topicArn
      }
    });

    // 👇 subscribe Lambda to SNS topic
    topic.addSubscription(new subs.LambdaSubscription(myLambda));

    topic.grantPublish(myLambda);

    // Add a permission to your lambda function to allow SNS to invoke it
    myLambda.addPermission('Permission', {
      principal: new iam.ServicePrincipal('sns.amazonaws.com'),
      sourceArn: topic.topicArn
    });

    topic.addToResourcePolicy(
      new PolicyStatement({
        sid: "Cross Account Access to subscribe",
        effect: Effect.ALLOW,
        principals: [new AccountPrincipal("203180463038")],
        actions: ["sns:Subscribe", "sns:Publish"],
        resources: [topic.topicArn],
      })
    );

    new cdk.CfnOutput(this, 'snsTopicArn', {
      value: topic.topicArn,
      description: 'The arn of the SNS topic',
    })
  }
}
