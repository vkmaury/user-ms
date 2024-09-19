import { Router } from 'express';;
import {getBundleById} from '../controller/bundleController'
import { getAllCategories,getCategoryById  } from '../controller/categoryController'
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.get('/getAllCategory', authenticateToken,checkUserRole,  getAllCategories );
router.get('/getCategory', authenticateToken,checkUserRole,  getCategoryById  );






export default router;