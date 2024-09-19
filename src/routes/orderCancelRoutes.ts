import { Router } from 'express';
import express from 'express';
import {cancelOrderController} from '../controller/orderCancelController';
// import {refundWebhookHandler} from '../controller/orderCancelController';
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.post('/cancelOrder', authenticateToken,checkUserRole,  cancelOrderController);

export default router;