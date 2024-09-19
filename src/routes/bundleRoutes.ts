import { Router } from 'express';;
import {getBundleById} from '../controller/bundleController'
import { getAllBundles } from '../controller/bundleController'
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.get('/getBundle', authenticateToken,checkUserRole,  getBundleById);
router.get('/getAllBundle', authenticateToken,checkUserRole,  getAllBundles );







export default router;
