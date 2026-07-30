import multer from "multer";

const storage = multer.memoryStorage();

// multer internally adds provided file in req.file
const upload = multer({
  storage
});

export default upload;