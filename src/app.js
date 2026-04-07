import express from "express";
import cors from "cors";
import healthCheckRoutes from "./routes/healthCheck.routes.js";
import authRouter from "./routes/auth.Routes.js";
import cookieParser from "cookie-parser";  
import projectRouter from "./routes/projects.routes.js";   
import projectMemberRouter from "./routes/projectMembers.routes.js";  
import taskRouter from "./routes/task.routes.js";    
import subtaskRouter from "./routes/subtask.routes.js";
import noteRouter from "./routes/notes.routes.js";
import aiRouter from "./routes/ai.routes.js";

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
app.use("/api/v1/project", projectRouter);
app.use("/api/v1/projects", projectMemberRouter); // Add this line to handle routes with projectId
app.use("/api/v1/tasks", taskRouter); // Add this line to handle task routes
app.use("/api/v1/subtasks", subtaskRouter); // Add this line to handle subtask routes
app.use("/api/v1/notes", noteRouter); // Add this line to handle notes routes


app.use("/api/v1/ai", aiRouter);



export default app;