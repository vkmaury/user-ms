import { Router } from 'express';;

import { addItemToWishlist, clearWishlist,removeItemFromWishlist,moveToCart,viewWishlist } from '../controller/wishlistController'
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.post('/createWishlist', authenticateToken,checkUserRole, addItemToWishlist);
router.post('/clearWishlistItems', authenticateToken,checkUserRole, clearWishlist  );
router.delete('/removeWishlistItems', authenticateToken,checkUserRole, removeItemFromWishlist  );
router.post('/moveItemFromCart', authenticateToken,checkUserRole, moveToCart);
router.get('/viewWishlist', authenticateToken,checkUserRole, viewWishlist);







export default router;