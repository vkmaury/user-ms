import { Router } from 'express';;
// import {getBundleById} from '../controller/bundleController'
import { viewSale  } from '../controller/viewSale'
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.get('/viewSaleProduct', authenticateToken,checkUserRole,  viewSale );

export default router;