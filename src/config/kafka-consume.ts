// import kafka from 'kafka-node';
// import User from '../models/User'; // Ensure User is correctly imported based on your structure

// const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
// const consumer = new kafka.Consumer(client, [{ topic: 'user-verification' }], {
//   groupId: 'user-ms-group', // Example group ID
//   autoCommit: true,
// });

// consumer.on('message', async (message) => {
//   try {
//     const data = JSON.parse(message.value.toString());
//     console.log('Received user data from auth service:', data);
//   } catch (error) {
//     console.error('Error processing user data:', error);
//   }
// });

// export { consumer }; // Exporting consumer as named export
