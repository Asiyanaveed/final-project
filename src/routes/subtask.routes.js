import express from 'express';
import { verifyJWT } from '../middlewares/auth-middleware.js';
import { requireProjectMember } from '../middlewares/projectMiddleware.js';
import { listSubtasks, createSubtask, updateSubtask, deleteSubtask } from '../controllers/subtask.controller.js';

const router = express.Router();

router.use(verifyJWT); // Apply JWT verification middleware to all routes in this router

router.route("/:projectId/t/:taskId/subtasks").all(requireProjectMember).get(listSubtasks)

router.route("/:projectId/t/:taskId/subtasks").all(requireProjectMember).post(createSubtask)

router.route("/:projectId/t/:taskId/subtasks/:subtasksId").all(requireProjectMember).patch(updateSubtask)

router.route("/:projectId/t/:taskId/subtasks/:subtasksId").all(requireProjectMember).delete(deleteSubtask)




export default router;