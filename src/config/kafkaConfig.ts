import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'authentication-ms-client',
  brokers: ['localhost:9092'],
});

export default kafka;
