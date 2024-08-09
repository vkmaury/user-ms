import { Router } from 'express';;
import {getProductByIdController} from '../controller/getProductDetails'
import {getAllProductsController} from '../controller/getAllProduct'
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.get('/getProduct', authenticateToken,checkUserRole,  getProductByIdController);
router.get('/getAllProduct', authenticateToken,checkUserRole,  getAllProductsController);






export default router;
