import express from "express";
import { verifyJWT } from "../middlewares/auth-middleware.js";
import { requireProjectMember , requireProjectAdmin } from "../middlewares/projectMiddleware.js";
import { createTask, listTask, getTaskDetails, updateTask, deleteTask } from "../controllers/task.controller.js";

const router = express.Router();


router.use(verifyJWT) // checking your login status


                               //athentication        athorization
router.route("/:projectId").all(requireProjectMember, requireProjectAdmin).post(createTask)
router.route("/:projectId").all(requireProjectMember).get(listTask)
router.route("/:projectId/:taskId").all(requireProjectMember).get(getTaskDetails)
router.route("/:projectId/:taskId").all(requireProjectMember, requireProjectAdmin).put(updateTask)
router.route("/:projectId/:taskId").all(requireProjectMember, requireProjectAdmin).delete(deleteTask)


export default router;