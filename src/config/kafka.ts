import kafka from 'kafka-node';

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
const producer = new kafka.Producer(client);

producer.on('ready', () => {
  console.log('Kafka Producer is ready.');
});

producer.on('error', (err) => {
  console.error('Kafka Producer error:', err);
});

export const sendMessageToAuthms = (topic: string, message: any, p0: (error: any, data: any) => void) => {
  const payloads = [
    {
      topic: topic,
      messages: JSON.stringify(message),
      partition: 0,
    },
  ];

  producer.send(payloads, (err, data) => {
    if (err) {
      console.error('Error sending message to admin-ms:', err);
    } else {
      console.log('Message sent to admin-ms:', data);
    }
  });
};
