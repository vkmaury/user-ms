import { Router } from 'express';;
// import multer from 'multer';
import upload from '../config/multerConfig';
import { checkUserRole } from '../verify-token/checkUserRole';
import { authenticateToken } from '../verify-token/verify-token';
import  addReview  from '../controller/ratingReviewController';
import  deleteReview  from '../controller/deleteReview';
import  getReview  from '../controller/getReview';
import  getAllReviews  from '../controller/getAllReview';
import  updateReview  from '../controller/updateReview';


const router = Router();
// Set up multer for file uploads

router.post('/reviews', authenticateToken,checkUserRole,addReview);
router.delete('/deleteReview', authenticateToken,checkUserRole,deleteReview);
router.get('/getReview', authenticateToken,checkUserRole,getReview);
router.get('/getAllReviews', authenticateToken,checkUserRole,getAllReviews );
router.put('/updateReview', authenticateToken,checkUserRole,updateReview );


export default router;