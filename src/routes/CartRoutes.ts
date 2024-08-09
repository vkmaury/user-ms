import { Router } from 'express';
import {addToCart} from '../controller/addToCard';

import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.post('/addToCart', authenticateToken,checkUserRole,  addToCart);



export default router;