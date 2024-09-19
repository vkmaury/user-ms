import { Router } from 'express';
import {orderProduct,getOrderById,getAllOrders,buyNowController } from '../controller/orderController';
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.post('/creatOrder', authenticateToken,checkUserRole, orderProduct);
router.get('/getOrderById', authenticateToken,checkUserRole, getOrderById);
router.get('/getAllOrders', getAllOrders );
router.post('/buyNow', authenticateToken,checkUserRole, buyNowController);


export default router;