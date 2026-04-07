import { index } from "drizzle-orm/gel-core";
import mongoose, {Schema} from "mongoose";

const projectSchema = new Schema({
    name: {type: String, required: true,  trim: true, unique: true},
    
    description: {type: String, trim: true, default: ""},

    createdBy:  {type: Schema.Types.ObjectId, ref: "User", required: true, index: true},

    settings:{
        visibility: {type: String, enum: ["public", "private", "team"], default: "private"},
        defaultTaskStatus: {type: String, enum: ["to-do", "in-progress", "done"], default: "to-do"},
        allowGuestsAccess: {type: Boolean, default: false},
    },

    metadata: {
        totalTasks: {type: Number, default: 0},
        completedTasks: {type: Number, default: 0},
        totalMembers: {type: Number, default: 1},
        lastActivity: {type: Date, default: Date.now}
    },

    isArchived: {type: Boolean, default: false},
    archivedAt: {type: Date},

  
}, {timestamps: true});

export const ProjectTable = mongoose.model("Project", projectSchema);
