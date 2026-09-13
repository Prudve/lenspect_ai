import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "raw"
        });

        console.log("file is uploaded on cloudinary", response.url);

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return response;
    } catch (error) {
        if (localFilePath && fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            } catch (unlinkError) {
                console.error("Failed to delete local temp file:", unlinkError);
            }
        }
        return null;
    }
}

const deleteFileOnCloudinary = async (publicId, resourceType = "image") => {
    try {
        if (!publicId) return null;
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });

        if (result.result === "ok") console.log("File deleted Successfully");

        return result.result === "ok" ? result : null;
    } catch (error) {
        console.error("Cloudinary deletion error:", error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFileOnCloudinary };