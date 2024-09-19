import express, { Application } from 'express';
import mongoose from 'mongoose';
import productRoutes from './routes/productRoutes';
import bundleRoutes from './routes/bundleRoutes';
import categoryRoutes from './routes/categoryRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import userHomePageRoutes from './routes/userHomePageRoutes';
import CartRoutes from './routes/CartRoutes';
import saleRoutes from './routes/saleRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import webhookRoutes from './routes/webhookRoutes';
import orderCancelRoutes from './routes/orderCancelRoutes';
import reviewRatingRoutes from './routes/reviewRatingRoutes';

import dotenv from 'dotenv';
const bodyParser = require('body-parser');
const cors = require('cors');
// const crypto = require('crypto');
// import { consumer } from './config/kafka-consume';


dotenv.config();

const app: Application = express();
const PORT: number = 3005;


// MongoDB Connection
const mongoURI: string = 'mongodb+srv://microservice-database:microservice-database@microservice-database.wsomfbj.mongodb.net/?retryWrites=true&w=majority&appName=microservice-database';

mongoose.connect(mongoURI).then(() => {

    console.log('MongoDB connected...');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});


app.use('/api/v1', webhookRoutes);

// Middleware
app.use(express.json());

app.use(express.urlencoded({ extended: true }));



// app.use(express.raw({ type: 'application/json' }));
app.use(cors()); 


// Routes
app.use('/api/v1', productRoutes);
app.use('/api/v1', CartRoutes);
app.use('/api/v1', bundleRoutes);
app.use('/api/v1', userHomePageRoutes);
app.use('/api/v1', categoryRoutes);
app.use('/api/v1', wishlistRoutes);
app.use('/api/v1', saleRoutes);
app.use('/api/v1', orderRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', orderCancelRoutes);
app.use('/api/v1', reviewRatingRoutes);



// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//     console.error(err.stack);
//     res.status(500).send('Something broke!');
//   });

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});








