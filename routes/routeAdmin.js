const express = require('express');
const authenticate = require('../middleware/verifyToken');
const handlePeminjaman = require('../controllers/adminController.js');

const router = express.Router();

// Rute dinamis berdasarkan parameter 'type'
router.get('/:type', authenticate, handlePeminjaman.getPeminjamanAll);
router.get('/:type/:peminjamanId', authenticate, handlePeminjaman.getPeminjamanById);
router.put('/:type/:peminjamanId/disetujui', authenticate, handlePeminjaman.editDisetujui);
router.put('/:type/:peminjamanId/ditolak', authenticate, handlePeminjaman.editDitolak);

module.exports = router;
