import { ProjectMemberTable } from "../models/projectMemberRole.model.js";
import { ApiError } from "../utils/api-error.js";

//you are  apart of this project or not
export const requireProjectMember = async (req, res, next) => {
    // Get the projectId from the request parameters
    const { projectId } = req.params;

   // finding the membership of the user in the project by matching the projectId and userId from the request object (which is set by the auth middleware)

    const membership =await ProjectMemberTable.findOne({
         project: projectId,
         user: req.user._id })

    // If the user is not a member of the project, return a 403 Forbidden response
    if (!membership) {
         return res.status(403).json(new ApiError(403, "You are not a member of this project"))
    }

    // attach membership info to the request object for later use in controllers
    req.membership = membership;

    // If the user is a member, proceed to the next middleware or route handler
    next();
}


// you are an admin
export const requireProjectAdmin = (req, res, next) => {
    // is user is also part of this project
    if(!req.membership){
        throw new ApiError(403, "You are not a member of this project")
    }

    // if user is not an admin, throw error
    if(req.membership.role !== "admin"){
        throw new ApiError(403, "You are not an admin of this project")
    }

    next() // proceed to api function
}

