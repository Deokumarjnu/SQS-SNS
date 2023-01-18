/* eslint-disable prettier/prettier */
import * as AWS from 'aws-sdk';
import { PublishInput, PublishResponse } from 'aws-sdk/clients/sns';
import { SQSEvent } from "aws-lambda";
const sns = new AWS.SNS();

export interface SQSRecord {
    body: string;
}

async function processSQSRecord(rec: SQSRecord): Promise<PublishResponse> {
    const params: PublishInput = {
        Message: rec.body,
        TopicArn: process.env.TOPIC_ARN,
        Subject: "Forwarding event message to SNS topic",
    };
    const snsResult: PublishResponse = await sns.publish(params).promise();
    console.info("Success !!!", { params, snsResult });
    return snsResult;
}

export async function main(event: SQSEvent) {
    try {
        await Promise.all(
            event.Records.map(async (rec: any): Promise<void> => {
                await processSQSRecord(rec);
            })
        );
        return {
            statusCode: 200,
            headers: { "Content-Type": "text/json" },
            body: {
                EventsReceived: [...event.Records].length,
            },
        };
    } catch (error) {
        console.error("Error", { error });
        return {
            statusCode: 400,
            headers: { "Content-Type": "text/json" },
            body: {
                EventsReceived: [...event.Records].length,
                Error: error
            },
        };
    }
};