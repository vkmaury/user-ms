// src/config/kafka.ts
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'your-client-id',
    brokers: ['localhost:9092'],
});

const admin = kafka.admin();

const createTopic = async (topicName: string) => {
    await admin.connect();
    const topics = await admin.listTopics();
    if (!topics.includes(topicName)) {
        await admin.createTopics({
            topics: [
                {
                    topic: topicName,
                    numPartitions: 1,
                    replicationFactor: 1,
                },
            ],
        });
        console.log(`Topic ${topicName} created`);
    } else {
        console.log(`Topic ${topicName} already exists`);
    }
    await admin.disconnect();
};

// Create user-verification topic
createTopic('user-verification').catch(console.error);

export { kafka };
