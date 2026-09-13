import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined in environment variables");
    }
    mongoose.connection.on("connected", () => console.log("📡 Mongoose connected"));
    mongoose.connection.on("open", () => console.log("📡 Mongoose connection open"));
    mongoose.connection.on("disconnected", () => console.log("⚠️ Mongoose disconnected"));
    mongoose.connection.on("error", (e) => console.error("❌ Mongoose error:", e.message));

    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, {
        dbName: DB_NAME,
        serverSelectionTimeoutMS: 15000,
    });
    console.log(`✅ MongoDB Atlas connected successfully! DB HOST: ${connectionInstance.connection.host}`);
    return connectionInstance;
};

export default connectDB;