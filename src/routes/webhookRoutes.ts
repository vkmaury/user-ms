import { Router } from 'express';
import express from 'express';
import {webhookHandler} from '../controller/payment'
import {refundWebhookHandler} from '../controller/orderCancelController'



const router = Router();
router.post('/webhook',express.raw({ type: 'application/json' }),webhookHandler);
router.post(
    '/refund-webhook',
    express.raw({ type: 'application/json' }),
    refundWebhookHandler
  );
export default router;