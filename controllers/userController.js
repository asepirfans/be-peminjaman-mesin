const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const { Cnc, Laser, Printing } = require('../models/peminjamanModel');
const apikeys = require('../apikey.json');
const SCOPE = ['https://www.googleapis.com/auth/drive'];

const oauth2Client = new google.auth.JWT(
    apikeys.client_email,
    null,
    apikeys.private_key,
    SCOPE
);

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const uploadFileToDrive = async (filePath, fileName) => {
    try {
        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                mimeType: 'application/octet-stream',
                parents:['1qIuyp30TAd2ALalYosfn9qv2DBcK9fiZ'] 
            },
            media: {
                mimeType: 'application/octet-stream',
                body: fs.createReadStream(filePath),
            },
        });

        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        const file = await drive.files.get({
            fileId: response.data.id,
            fields: 'webViewLink',
        });

        return file.data.webViewLink;
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error);
        throw error;
    }
};

// Konfigurasi multer untuk menangani upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

const getModelAndMesinName = (type) => {
    switch(type) {
        case 'cnc':
            return { Model: Cnc, mesinName: 'Cnc Milling' };
        case 'laser':
            return { Model: Laser, mesinName: 'Laser Cutting' };
        case 'printing':
            return { Model: Printing, mesinName: '3D Printing' };
        default:
            throw new Error('Invalid type parameter');
    }
}

const peminjamanHandler = async (req, res) => {
    const { type } = req.params;
    const { Model, mesinName } = getModelAndMesinName(type);
    
    const { email, nama_pemohon, tanggal_peminjaman, awal_peminjaman, akhir_peminjaman, jumlah, detail_keperluan, program_studi, kategori } = req.body;
    const { userId, userName } = req.username;

    if ((kategori === 'Praktek' || kategori === 'Proyek Mata Kuliah') && (!detail_keperluan || detail_keperluan.trim().length === 0)) {
        return res.status(400).json({
            success: false,
            statusCode: res.statusCode,
            message: "Detail keperluan wajib diisi"
        });
    }
    if (!email || !nama_pemohon || !tanggal_peminjaman || !awal_peminjaman || !akhir_peminjaman || !jumlah || !program_studi || !kategori || !req.file) {
        return res.status(400).json({
            success: false,
            statusCode: res.statusCode,
            message: "Please complete input data"
        });
    }

    try {
        const filePath = req.file.path;
        const fileName = req.file.filename;

        const fileLink = await uploadFileToDrive(filePath, fileName);
        fs.unlinkSync(filePath);

        const peminjamanEntry = await Model.create({
            nama_mesin: mesinName,
            email,
            nama_pemohon,
            tanggal_peminjaman,
            awal_peminjaman,
            akhir_peminjaman,
            jumlah,
            detail_keperluan,
            program_studi,
            kategori,
            desain_benda: fileLink,
            status: 'Menunggu',
            user: userId
        });

        res.status(200).json({
            success: true,
            message: "Uploaded!",
            data: {
                nama_mesin: peminjamanEntry.nama_mesin,
                email,
                nama_pemohon,
                tanggal_peminjaman,
                awal_peminjaman,
                akhir_peminjaman,
                jumlah,
                detail_keperluan,
                program_studi,
                kategori,
                desain_benda: fileLink,
                status: peminjamanEntry.status,
                waktu: peminjamanEntry.waktu,
                user: userName
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error uploading data"
        });
    }
};

const getPeminjamanAllHandler = async (req, res) => {
    const { type } = req.params;
    const { Model } = getModelAndMesinName(type);
    const { userId } = req.username;
    try {
        const peminjamanForm = await Model.find({ user: userId });
        if (!peminjamanForm || peminjamanForm.length === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }

        peminjamanForm.sort((a, b) => {
            if (a.status === 'Menunggu' && (b.status === 'Disetujui' || b.status === 'Ditolak')) return -1;
            if ((a.status === 'Disetujui' || a.status === 'Ditolak') && b.status === 'Menunggu') return 1;
            return 0;
        });

        const responseData = peminjamanForm.map(item => ({
            id: item._id,
            nama_pemohon: item.nama_pemohon,
            nama_mesin: item.nama_mesin,
            status: item.status,
        }));

        res.status(200).json({
            success: true,
            statusCode: res.statusCode,
            data: responseData,
        });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getPeminjamanByIdHandler = async (req, res) => {
    const { type, peminjamanId } = req.params;
    const { Model } = getModelAndMesinName(type);
    const { userId } = req.username;
    try {
        const peminjaman = await Model.findOne({
            _id: peminjamanId,
            user: userId
        }).populate('user', 'username email');

        if (!peminjaman) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }

        const responseData = {
            id: peminjaman._id,
            email: peminjaman.email,
            nama_pemohon: peminjaman.nama_pemohon,
            tanggal_peminjaman: peminjaman.tanggal_peminjaman,
            awal_peminjaman: peminjaman.awal_peminjaman,
            akhir_peminjaman: peminjaman.akhir_peminjaman,
            jumlah: peminjaman.jumlah,
            program_studi: peminjaman.program_studi,
            kategori: peminjaman.kategori,
            detail_keperluan: peminjaman.detail_keperluan,
            desain_benda: peminjaman.desain_benda,
            status: peminjaman.status,
            waktu: peminjaman.waktu,
        };

        res.status(200).json({
            success: true,
            statusCode: res.statusCode,
            data: responseData,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    upload,
    peminjamanHandler,
    getPeminjamanAllHandler,
    getPeminjamanByIdHandler
};