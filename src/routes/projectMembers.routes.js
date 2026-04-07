import express from "express";
import { listProjectMember, addProjectMember, updateProjectMember, removeProjectMember } from "../controllers/projectMembers.controller.js";
import { verifyJWT } from "../middlewares/auth-middleware.js";
import { requireProjectMember, requireProjectAdmin } from "../middlewares/projectMiddleware.js";

const router = express.Router();
//---------------------------------------- Middlewares
router.use(verifyJWT) // you are login or not 
// router.use(requireProjectMember) // you are member of this  project or not

//---------------------------------------- Routes   
router.route("/:projectId/members").all(requireProjectMember).get(listProjectMember)// show all member

router.route("/:projectId/members").all(requireProjectMember).post(requireProjectAdmin ,addProjectMember) // add a member to a project

router.route("/:projectId/members/:userId").all(requireProjectMember).put(requireProjectAdmin, updateProjectMember) // update a member role or permissions

router.route("/:projectId/members/:userId").all(requireProjectMember).delete(requireProjectAdmin, removeProjectMember) // remove a member from a project

export default router

