import express from "express";
import cors from "cors";
import healthCheckRoutes from "./routes/healthCheck.routes.js";
import authRouter from "./routes/auth.Routes.js";
import cookieParser from "cookie-parser";           

const app = express();
app.use(cookieParser());  // to parse cookies from client requests



//---------------------------------Middleware
app.use(express.json({ limit: "16kb" }));  // to make readable json data
app.use(express.urlencoded({ extended: true, limit: "16kb" }));//  this will encode your url for safety reason
app.use(express.static("public")); //  serve static files from the "public" directory that do not change

//---------------------------------CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}))

//---------------------------------API
app.get("/", (req, res) => {
    res.end("✅ Welcome to Final Project API");
});

//---------------------------------Routes
app.use("/api/v1/health-check", healthCheckRoutes);
app.use("/api/v1/auth", authRouter);


export default app;