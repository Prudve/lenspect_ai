import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { apiLimiter } from "./middlewares/rateLimiter.middleware.js";
import userRouter from "./routes/user.routes.js";
import inspectionRouter from "./routes/inspection.routes.js";
import noticeRouter from "./routes/notice.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import queueRouter from "./routes/queue.routes.js";

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/", apiLimiter);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/inspections", inspectionRouter);
app.use("/api/v1/notices", noticeRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/queue", queueRouter);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    return res.status(statusCode).json({
        statusCode,
        success: false,
        message,
        errors: err.errors || [],
        data: null
    });
});

export default app;