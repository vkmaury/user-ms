import express, { Application } from 'express';
import mongoose from 'mongoose';
import productRoutes from './routes/productRoutes';
import CartRoutes from './routes/CartRoutes';
import dotenv from 'dotenv';
// import { consumer } from './config/kafka-consume';


dotenv.config();

const app: Application = express();
const PORT: number = 3005;

// Middleware
app.use(express.json());

// MongoDB Connection
const mongoURI: string = 'mongodb+srv://microservice-database:microservice-database@microservice-database.wsomfbj.mongodb.net/?retryWrites=true&w=majority&appName=microservice-database';

mongoose.connect(mongoURI).then(() => {
    console.log('MongoDB connected...');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// consumer.on('error', (error) => {
//   console.error('Kafka consumer error:', error);
// });

// Routes
app.use('/api/v1', productRoutes);
app.use('/api/v1', CartRoutes);


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








