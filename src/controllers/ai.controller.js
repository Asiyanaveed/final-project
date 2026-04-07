import { asyncHandler } from "../utils/async-handler.js";
import openai from "../config/openai.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { ProjectTable } from "../models/project.models.js";
import { tableTask } from "../models/task.model.js";
import { ProjectMemberTable } from "../models/projectMemberRole.model.js";

const askAI = async (systemPrompt, userPrompt) => {

    const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: userPrompt,
        instructions: systemPrompt,
        temperature: 0.7, // Adjust the temperature for more creative or focused responses
    });

    const content = response.output_text;

    return {
        result: JSON.parse(content),
        metaData: {
            processingTime: Date.now() 
        }
        
    }
}



export const suggestTasks = asyncHandler(async (req, res) => {

    const { projectId } = req.params;
    if (!projectId) return res.status(400).json(ApiResponse.error("Project ID is required"));

    const {context, count, includeSubtasks} = req.body;
    if (!context) return res.status(400).json(ApiResponse.error("Context is required"));

    const project = await ProjectTable.findById(projectId);
    if (!project) return res.status(404).json(ApiResponse.error("Project not found"));
    
    // Get existing tasks for the project to provide context to the AI
    const existingTasks = await tableTask.find({project: projectId }).limit(20)

    // Get project members to provide context to the AI
    const members = await ProjectMemberTable.find({project: projectId})

    const sysPrompt = `you are a project managment AI assistant.
    your job is to suggest relevent task for software projects.
    always respond in JSON format only`

    // Build the user prompt with project context
    const userPrompt = `
    Project Name: ${project.name}
    project context: ${context}
    team size: ${members.length} members
    team members: ${members.map(m => m.user).join(", ")}
    existing tasks(avoid duplicates): ${existingTasks.map(t => t.description).join(", ")}
    generate ${count || 5} tasks${includeSubtasks ? " with subtasks" : ""} 
    respond with this exact JSON format:
    {
       suggestions:[
        {
            title: "Task title",
            description: "Task description",
            priority: "low/medium/high",
            estimatedHours: number,
            suggestedTags: ["tag1", "tag2"],
            subtasks:[""Subtask 1", "Subtask 2"] // only include if includeSubtasks is true
            dependencies: ["existing task 1", "existing task 2"] // if any
        }
       ],
       reasoning:"why these task were suggested, explain your resoning in detail"
       confident: 0.0 to 1.0 // how confident the AI is about these suggestions, 1.0 being very confident
       0 means not confident at all
    }`

    const startTime = Date.now();
    const {result, metaData} = await askAI(sysPrompt, userPrompt);
    metaData.processingTime = Date.now() - startTime;

    return res.status(200).json(new ApiResponse(200, {...result, metaData}, "Task suggestions generated successfully"))
    
})








export const analyzeRisks = asyncHandler(async (req, res) => {
    const {projectId} = req.params
    if(!projectId) return res.status(400).json({ error: "Project ID is required" })

    const project = await ProjectTable.findById(projectId)
    if(!project) return res.status(404).json({ error: "Project not found" })

    const now = new Date()
    
    const [totalTasks, doneTasks, overDueTask, inProgressTasks] = await Promise.all([
        tableTask.countDocuments({project: projectId}),
        tableTask.countDocuments({project: projectId, status: "done"}),
        tableTask.countDocuments({project: projectId, dueDate: {$lt: now}, status: {$ne: "done"}}),
        tableTask.countDocuments({project: projectId, status: "in-progress"}),
    ])

    // Get overdue task details
    const overdueTasksDetails = await tableTask.find({project: projectId, dueDate: {$lt: now}, status: {$ne: "done"}})
    .select("title dueDate priority assignedTo")
    .limit(10)

    // Get member workload
    const members = await ProjectMemberTable.find({project: projectId})

    // calculate workload for each member
    const workloads = await Promise.all(members.map(async (m)=>{
        const count = await tableTask.countDocuments({
            project: projectId,
            assignedTo: m.user._id,
            status: {$ne: "done"}
        })

        return {username: m.user.username, activeTasks: count}
    }))

    const sysPrompt = `you are a project risk analysis AI assistant.
    Analyze project data and identify potential risks with recommendations.
    Always respond in JSON format only.
    `

    const usrPrompt = `
    project name: ${project.name}
    total tasks: ${totalTasks}
    completed tasks: ${doneTasks}
    in-progress tasks: ${inProgressTasks}
    overdue tasks: ${overDueTask}
    
    overdue task details: 
    ${overdueTasksDetails.map((t)=>(
        `- ${t.title}, due on ${t.dueDate.toDateString()}, priority: ${t.priority}, assigned to: ${t.assignedTo ? t.assignedTo.username : "unassigned"}`
    )).join("\n")}
    }

    team workload:
    ${workloads.map(w => `- ${w.username}: ${w.activeTasks} active tasks`).join("\n")}
    
    respond with this exact JSON format:
    {
        "overallRisk" : "low/medium/high/critical",
        "healthScore" : 0 to 100, // 100 means very healthy, 0 means very unhealthy,
        "risks" : [
            {
                "category": "schedule/budget/scope/quality/resource/other",
                "severity": "low/medium/high/critical",
                "title": "risk title",
                "description": "detailed risk description",
                "recommendation": "detailed recommendation to mitigate this risk",
                "impact" : "potential impact description",
            }
        ],

        "positives": ["what is going well in this project? list of positives"],
        "summary": "overall summary of the project health and risks in detail"
    }
    `
    
    const startTime = Date.now()
    const {result, metaData} = await askAI(sysPrompt, usrPrompt)
    metaData.processingTime = Date.now() - startTime

    return res.status(200).json(new ApiResponse(200, {...result, metaData}, "Project risk analysis generated successfully"))

})









export const predictTimeline = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json(ApiResponse.error("Project ID is required"));

   const project = await ProjectTable.findById(projectId);
   if (!project) return res.status(404).json(ApiResponse.error("Project not found"));

   const tasks = await tableTask.find({project: projectId }).select("title status priority duedate estimatedhours")

   const sysPrompt = `you are a project timeline prediction AI assistant.
   Analyze task data and predict realistic timelines for project completion.
   always respond in JSON format only`

    const userPrompt = `
    project Name: ${project.name}
    created at: ${project.createdAt}
    
    Task details:
    - Total: ${tasks.length}
    - Todo: ${tasks.filter(t => t.status === "todo").length}
    - In Progress: ${tasks.filter(t => t.status === "inprogress").length}
    - Done: ${tasks.filter(t => t.status === "done").length}
    
    Estimated hours remaining: ${tasks.filter(t => t.status !== "done").reduce((sum, t) => sum + (t.estimatedHours || 0), 0)}
    
    overdue tasks: ${tasks.filter(t => t.dueDate  < new Date() && t.status !== "done").length}
    
    respond with this exact JSON format:
    {
    predictedCompletionDate: "2024-12-31",
    confidence: 0.0 to 1.0 // how confident the AI is about this prediction, 1.0 being very confident
    0 means not confident at all
    estimatedDaysRemaining: number,
    scenarios:{
        optimistic: "ISO date format",
        realistic: "ISO date format",
        pessimistic: "ISO date format"
        },
        bottlenecks: ["bottlenecks 1", "bottlenecks 2",...], 
        recommendations: ["recommendation 1", "recommendation 2",...],
        summary: "detailed summary of the timeline prediction and resoning"
    
  }
    `
    const startTime = Date.now();
    const {result, metaData} = await askAI(sysPrompt, userPrompt);
    metaData.processingTime = Date.now() - startTime;

    return res.status(200).json(new ApiResponse(200, {...result, metaData}, "Timeline prediction generated successfully"))
    
})








export const balanceWorkload = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json(ApiResponse.error("Project ID is required"));

   const project = await ProjectTable.findById(projectId);
   if (!project) return res.status(404).json(ApiResponse.error("Project not found"));

   const member = await ProjectMemberTable.find({project: projectId})

   //calculate workload for each member based on their assigned tasks
   const workload = await Promise.all(member.map( async (m) => {
    const tasks = await tableTask.find({project: projectId, assignedTo: m.user._id, status: {$ne: "done"}}).select("title status priority")
    return {
        user: m.user.username,
        activeTasks: tasks.length,
        tasks: tasks.map(t => ({title: t.title, status: t.status, priority: t.priority}))
    }
   }))

   // get unassigned tasks
    const unassignedTasks = await tableTask.find({project: projectId, assignedTo: null, status: {$ne: "done"}}).select("title status priority")

    const sysPrompt = `you are a project workload balancing AI assistant.
    Analyze team workload and suggest optimal task assignments to balance the workload.
    Always respond in JSON format only.`

    const usrPrompt = `
    project name: ${project.name}

    team members and their workloads:
    ${workloads.map(w => `- ${w.username}: ${w.activeTasks} active tasks (${w.tasks.map(t => `${t.title} [${t.status}, ${t.priority}]`).join(", ")})`).join("\n")}

    unassigned tasks:
    ${unassignedTasks.map(t => `- ${t.title} [${t.status}, ${t.priority}]`).join("\n")}

    respond with this exact JSON format:
    {
        isBalanced: true/false,
        teamAverage: number,
        overLoadedMembers: ["username1", "username2", ...],
        underLoadedMembers: ["username1", "username2", ...],
        suggestions: [
            {
                action: "assign/reassign",
                task: "task title",
                fromMember: "username or unassigned",
                toMember: "username or unassigned",
                reasoning: "detailed reasoning for this suggestion"
            }
        ],
        summary: "overall summary of the workload balance and suggestions"
    }`

    const startTime = Date.now()
    const {result, metaData} = await askAI(sysPrompt, usrPrompt)
    metaData.processingTime = Date.now() - startTime

    return res.status(200).json(new ApiResponse(200, {...result, metaData}, "Workload balance analysis generated successfully"))
})









export const smartAssignTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json(ApiResponse.error("Task ID is required")); 

    const task = await tableTask.findById(taskId).populate("project")
    if (!task) return res.status(404).json(ApiResponse.error("Task not found"));
    

    const members = await ProjectMemberTable.find({project: task.project._id})

    const {considerWorkload = true, considerSkills = true} = req.body;

    // get workload for each member
    const workloads = await Promise.all(members.map(async (m)=>{
        const count = await tableTask.countDocuments({
            project: task.project._id,
            assignedTo: m.user._id,
            status: {$ne: "done"}
        })

        return {
            username: m.user.username,
            userId: m.user._id,
            fullName: m.user.fullName,
            activeTasks: count,
            role: m.role
        }
    }))

    const sysPrompt = `you are a smart task assignment AI assistant.
    your job is to suggest the best team member to assign a task to based on their current workload, skills, and project role.
    Always respond in JSON format only.`

    const usrPrompt = `
    project name: ${task.project.name}
    task title: ${task.title}
    task description: ${task.description}
    task priority: ${task.priority}
    task estimated hours: ${task.estimatedHours}

    team members and their workloads:
    ${workloads.map(w => `- ${w.username} (${w.fullName}), role: ${w.role}, active tasks: ${w.activeTasks}`).join("\n")}

    consider workload: ${considerWorkload}
    consider skills/roles:${considerSkills} 

    respond with this exact JSON format:
    {
       recommandations:[
       {
       userId: "user id",
       username: "username",
       fullName: "full name",
       score: 0.0 to 1.0,
       reasoning: ["reason1", "reason2", ...],
       estimatedTimeToComplete: "ISO date string",
       riskFactor: ["risk1", "risk2", ...]
       }
       ],
         summary: "overall summary of the assignment suggestions"
    }
   `
    const startTime = Date.now()
    const {result, metaData} = await askAI(sysPrompt, usrPrompt)
    metaData.processingTime = Date.now() - startTime

    return res.status(200).json(new ApiResponse(200, {...result, metaData}, "Smart task assignment generated successfully"))
})









export const prioritizeTask = asyncHandler(async (req, res) => {

    const { taskId } = req.params;
    if (!taskId) return res.status(400).json(ApiResponse.error("Task ID is required"));

    const task = await tableTask.findById(taskId).populate("project")
    if (!task) return res.status(404).json(ApiResponse.error("Task not found"));

   //get other tasks in the same project for context
   const projectTasks = await tableTask.find({project: task.project._id}).select("title priority status dueDate")

   const sysPrompt = `you are a task prioritization AI assistant.
    Your job is to suggest the priority of a task based on its details and the context of other tasks in the project.
    Always respond in JSON format only.`

    const usrPrompt = `
    project name: ${task.project.name}
    task title: ${task.title}
    task description: ${task.description}
    current priority: ${task.priority}
    task status: ${task.status}
    due date: ${task.dueDate.toDateString()}
    estimated hours: ${task.estimatedHours}

    other tasks in the project:
    ${projectTasks.map(t => `- ${t.title} [${t.status}, ${t.priority}, due: ${t.dueDate.toDateString()}]`).join("\n")}

    respond with this exact JSON format:
    {
        currentPriority: "current priority",
        suggestedPriority: "low/medium/high/critical",
        shouldChanged: true/false,
        confidence: 0.0 to 1.0,
        reasoning: ["reason1", "reason2", ...],
        urgencyFactors: ["factor1", "factor2", ...],
        importantFactors: ["factor1", "factor2", ...],
        summary: "overall summary of the prioritization recommendation and reasoning"
    }
    `

    const startTime = Date.now()
    const {result, metaData} = await askAI(sysPrompt, usrPrompt)
    metaData.processingTime = Date.now() - startTime
    
    return res.status(200).json(new ApiResponse(200, {...result, metaData}, "Task prioritization generated successfully"))


})











export const summarizeMeeting = asyncHandler(async (req, res) => {

    const {notes, projectId, meetingDate} = req.body;
    if(!notes || !projectId || !meetingDate) return res.status(400).json(ApiResponse.error("Notes, project ID and meeting date are required"))

    const project = await ProjectTable.findById(projectId);
    if (!project) return res.status(404).json(ApiResponse.error("Project not found"));

    const sysPrompt = `you are a meeting summarization AI assistant.
    Your job is to summarize the meeting notes into key points, decisions made, action items with assignees and deadlines, and overall summary.
    Always respond in JSON format only.`

    const usrPrompt = `
    project name: ${project.name}
    meeting date: ${new Date(meetingDate).toDateString()}
    meeting notes:
    ${notes}

    respond with this exact JSON format:
    {
        "summary": "overall summary of the meeting",
        "keyPoints": ["key point 1", "key point 2", ...],
        "actionItems": [
            {
                task: "action item description",
                assignee: "assignee name",
                dueDate: "ISO date string",
                priority: "low/medium/high/critical",
                reasoning: ["reason1", "reason2", ...]
            }
        ],
        "blockers": ["blocker1", "blocker2", ...],
        "nextSteps": ["next step 1", "next step 2", ...],
        "followUpDueDate": "ISO date format"
    }
    ` 

    const startTime = Date.now()
    const {result, metaData} = await askAI(sysPrompt, usrPrompt)
    metaData.processingTime = Date.now() - startTime

    return res.status(200).json(new ApiResponse(200, {...result, metaData}, "Meeting summarization generated successfully"))   

})

