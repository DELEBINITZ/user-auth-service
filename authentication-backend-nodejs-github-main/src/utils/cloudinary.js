import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import {PROJECT_NAME} from './constants.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadFileOnCloudinary = async (localFilePath, folderName) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
            folder: PROJECT_NAME + '/' + folderName,
        });
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log('Error while uploading file', error);
        return null;
    }
};

const deleteFileFromCloudinary = async (folderName, url) => {
    try {
        const publicId = url.split('/').pop().split('.')[0];
        if (!publicId) return null;
        const response = await cloudinary.uploader.destroy(
            PROJECT_NAME + '/' + folderName + '/' + publicId
        );
        return response;
    } catch (error) {
        console.log('Error while deleting file', error);
        return null;
    }
};

export {uploadFileOnCloudinary, deleteFileFromCloudinary};
