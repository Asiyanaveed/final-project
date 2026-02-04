//---------------------------------User Roles Enum---------------------------------//
export const UserRolesEnum = {
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "members",
};

export const AvalaibleUserRole = Object.values(UserRolesEnum);

//---------------------------------Task Status Enum---------------------------------//
export const TaskStatusEnum = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    REVIEW: "review",
    DONE: "done"
};

export const AvailableTaskStatus = Object.values(TaskStatusEnum);