import multer from 'multer';
import path from 'path';

// Configure Multer storage and file handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Directory where files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed') as any, false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
  }).fields([
    { name: 'images', maxCount: 10 } // Expecting 'images' field with up to 10 files
  ]);
  

export default upload;
