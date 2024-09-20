import { Router } from 'express';;
import {inviteFriend} from '../controller/refferalController'

import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.post('/inviteFriend', authenticateToken,checkUserRole,  inviteFriend);
// router.get('/getAllProduct', authenticateToken,checkUserRole,  getAllProductsController);






export default router;
