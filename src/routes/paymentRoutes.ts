import { Router } from 'express';
import {checkoutController,placeOrderController,verifyPaymentController,removeCouponCodeController} from '../controller/payment';
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.post('/orderPlace',authenticateToken,checkUserRole,placeOrderController);
// router.post('/updatePaymentInfo',updatePaymentInfo);
router.post('/checkout', authenticateToken,checkUserRole,checkoutController);
router.post('/verifyPayment', authenticateToken,checkUserRole,verifyPaymentController);
router.patch('/removeCoupon', authenticateToken,checkUserRole,removeCouponCodeController);





export default router;