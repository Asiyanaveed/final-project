import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { ProjectTable } from "../models/project.models.js";
import { ProjectMemberTable } from "../models/projectMemberRole.model.js";



export const createProject = asyncHandler(async (req, res) => {
    const { name, description = "", settings = {} } = req.body;

    //  validation checks
    if (!name || name.trim() === "") {
       throw new ApiError(400, "Project name is required")
    }

    // Create new project into the database
    const project = await ProjectTable.create({
        name: name.trim(),
        description: description.trim(),
        createdBy: req.user._id,
        settings: {
            visibility: settings.visibility || "private",
            defaultTaskStatus: settings.defaultTaskStatus || "to-do",
            allowGuestsAccess: settings.allowGuestsAccess || false,
        },
        metadata: {
            totalTasks: 0,
            completedTasks: 0,
            totalMembers: 1,
            lastActivity: new Date(),
        },
    });

    // Add the creator as project-admin in ProjectMemberRole collection
    await ProjectMemberTable.create({
        user: req.user._id,
        project: project._id,
        role: "admin",
        permissions: {
            canCreateTasks: true,
            canEditTasks: true,
            canDeleteTasks: false,
            canManageMembers: true,
            canViewReports: true
        },
        invitedBy: req.user._id
})

    res.status(201).json(new ApiResponse(true, "Project created successfully",  project ));

})







export const listMyProjects = asyncHandler(async (req, res) => {
    
    // find all projects on behalf on user id
    const membership = await ProjectMemberTable.find({ user: req.user._id }).populate("project").sort({ createdAt: -1 })
    
    // modified membership  array to get only 2 properties 
    const projects = membership.filter((m)=>(m.project && !m.project.isArchived))
    .map((m)=>({
        project: m.project,
        role: m.role
    }))

    return res.status(200).json(new ApiResponse(200, "Projects fetched successfully", { projects }));
})
