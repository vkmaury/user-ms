import { Router } from 'express';;
import {getHomePageData} from '../controller/userHomeController'
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.get('/userHomePage', authenticateToken,checkUserRole,  getHomePageData);








export default router;