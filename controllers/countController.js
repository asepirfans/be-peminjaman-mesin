const Count = require('../models/countModel');
const {Cnc, Laser, Printing} = require('../models/peminjamanModel');

const getCounts = async (req, res) => {
    const { type } = req.params; // type diambil dari parameter URL

    let Model;
    let mesinType;

    // Tentukan model dan type berdasarkan parameter
    switch(type) {
        case 'cnc':
            Model = Cnc;
            mesinType = 'cnc';
            break;
        case 'laser':
            Model = Laser;
            mesinType = 'laser';
            break;
        case 'printing':
            Model = Printing;
            mesinType = 'printing';
            break;
        default:
            return res.status(400).json({
                success: false,
                message: 'Invalid type parameter'
            });
    }

    try {
        const disetujuiCount = await Model.countDocuments({status: 'Disetujui'});
        const ditolakCount = await Model.countDocuments({status: 'Ditolak'});
        const menungguCount = await Model.countDocuments({status: 'Menunggu'});

        const countData = {
            [`disetujui_${mesinType}`]: disetujuiCount,
            [`ditolak_${mesinType}`]: ditolakCount,
            [`menunggu_${mesinType}`]: menungguCount,
            waktu: new Date(),
        };

        // Find the first document and update it, or create it if it doesn't exist
        const updatedCount = await Count.findOneAndUpdate(
            {},
            countData,
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: 'Counts retrieved and updated successfully',
            data: updatedCount,
        });
    } catch (error) {
        console.error('Error getting counts:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting counts',
        });
    }
};

module.exports = { getCounts };
