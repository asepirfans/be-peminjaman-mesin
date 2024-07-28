const express = require('express');
const { upload, peminjamanHandler, getPeminjamanAllHandler, getPeminjamanByIdHandler } = require('../controllers/userController');
const { getCounts } = require('../controllers/countController');
const authenticate = require('../middleware/verifyToken');

const router = express.Router();

// Rute dinamis berdasarkan parameter 'type'
router.post('/:type/peminjaman', authenticate, upload.single('desain_benda'), peminjamanHandler);
router.get('/:type/peminjamanAll', authenticate, getPeminjamanAllHandler);
router.get('/:type/peminjaman/:peminjamanId', authenticate, getPeminjamanByIdHandler);


router.get('/:type/counts', authenticate, getCounts);

module.exports = router;
