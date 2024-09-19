import { Router } from 'express';
import {addToCart} from '../controller/addToCard';
import { removeFromCart} from '../controller/removeCartItems';
import {  clearCart} from '../controller/removeAllCartItems';
import {  getCartItems} from '../controller/viewCartItemsController';
import { updateCart  } from '../controller/updateCartItems';
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
// import { applyDiscount } from '../controller/applyDiscount';

const router = Router();

router.post('/addToCart', authenticateToken,checkUserRole,  addToCart);
router.post('/removeCartItems', authenticateToken,checkUserRole,  removeFromCart);
router.delete('/removeAllCartItems', authenticateToken,checkUserRole,  clearCart);
router.put('/updateCartItems', authenticateToken,checkUserRole,  updateCart);
router.get('/viewCartItems', authenticateToken,checkUserRole,  getCartItems);




export default router;