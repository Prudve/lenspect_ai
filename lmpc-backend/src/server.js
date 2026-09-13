import "dotenv/config";

import connectDB from "./db/index.js";
import app from "./app.js";
import "./queues/inspection.worker.js";

// Ensure database connection is fully established before starting HTTP listener
connectDB()
.then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`🚀 LMPC Backend Server is running at port : ${port}`);
    });
})
.catch((err) => {
    console.error("❌ MongoDB Atlas connection fatal error:", err);
    // In dev mode, still start server so fallback data can be served
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`🚀 LMPC Backend Server is running in fallback mode at port : ${port}`);
    });
});