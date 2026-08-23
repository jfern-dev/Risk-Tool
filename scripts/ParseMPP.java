import org.mpxj.ProjectFile;
import org.mpxj.Task;
import org.mpxj.Relation;
import org.mpxj.reader.UniversalProjectReader;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;

public class ParseMPP {
    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("{\"error\": \"No file path provided\"}");
            System.exit(1);
        }
        
        String filePath = args[0];
        ObjectMapper mapper = new ObjectMapper();
        
        try {
            UniversalProjectReader reader = new UniversalProjectReader();
            ProjectFile project = reader.read(filePath);
            
            ObjectNode root = mapper.createObjectNode();
            ArrayNode tasksNode = mapper.createArrayNode();
            ArrayNode linksNode = mapper.createArrayNode();
            
            List<Task> allTasks = project.getTasks();
            for (Task task : allTasks) {
                if (task.getName() != null && task.getID() != null) {
                    ObjectNode taskNode = mapper.createObjectNode();
                    
                    // Identifiers & Hierarchy
                    taskNode.put("id", String.valueOf(task.getID()));
                    String taskUuid = "";
                    if (task.getGUID() != null) {
                        taskUuid = task.getGUID().toString();
                    } else if (task.getUniqueID() != null) {
                        taskUuid = String.valueOf(task.getUniqueID());
                    } else {
                        taskUuid = String.valueOf(task.getID());
                    }
                    taskNode.put("uuid", taskUuid);
                    taskNode.put("uniqueId", task.getUniqueID() != null ? String.valueOf(task.getUniqueID()) : String.valueOf(task.getID()));
                    taskNode.put("name", task.getName());
                    taskNode.put("isSummary", task.getSummary());
                    taskNode.put("outlineLevel", task.getOutlineLevel() != null ? task.getOutlineLevel() : 1);
                    if (task.getOutlineNumber() != null) taskNode.put("outlineNumber", task.getOutlineNumber());
                    if (task.getWBS() != null) taskNode.put("wbs", task.getWBS());
                    if (task.getParentTask() != null && task.getParentTask().getID() != null) {
                        taskNode.put("parentTaskId", String.valueOf(task.getParentTask().getID()));
                    }
                    if (task.getParentTaskUniqueID() != null) {
                        taskNode.put("parentTaskUniqueId", String.valueOf(task.getParentTaskUniqueID()));
                    }
                    
                    // Dates & Schedule
                    if (task.getStart() != null) taskNode.put("start", task.getStart().toString());
                    else taskNode.putNull("start");
                    
                    if (task.getFinish() != null) taskNode.put("finish", task.getFinish().toString());
                    else taskNode.putNull("finish");
                    
                    if (task.getDuration() != null) taskNode.put("duration", task.getDuration().getDuration());
                    else taskNode.put("duration", 0.0);
                    
                    if (task.getActualStart() != null) taskNode.put("actualStart", task.getActualStart().toString());
                    if (task.getActualFinish() != null) taskNode.put("actualFinish", task.getActualFinish().toString());
                    if (task.getActualDuration() != null) taskNode.put("actualDuration", task.getActualDuration().getDuration());
                    if (task.getRemainingDuration() != null) taskNode.put("remainingDuration", task.getRemainingDuration().getDuration());
                    
                    if (task.getEarlyStart() != null) taskNode.put("earlyStart", task.getEarlyStart().toString());
                    if (task.getEarlyFinish() != null) taskNode.put("earlyFinish", task.getEarlyFinish().toString());
                    if (task.getLateStart() != null) taskNode.put("lateStart", task.getLateStart().toString());
                    if (task.getLateFinish() != null) taskNode.put("lateFinish", task.getLateFinish().toString());
                    
                    if (task.getTotalSlack() != null) taskNode.put("totalSlack", task.getTotalSlack().getDuration());
                    if (task.getFreeSlack() != null) taskNode.put("freeSlack", task.getFreeSlack().getDuration());
                    if (task.getDeadline() != null) taskNode.put("deadline", task.getDeadline().toString());
                    
                    // Constraints
                    if (task.getConstraintType() != null) taskNode.put("constraintType", task.getConstraintType().toString());
                    if (task.getConstraintDate() != null) taskNode.put("constraintDate", task.getConstraintDate().toString());
                    
                    // Progress & Flags
                    if (task.getPercentageComplete() != null) taskNode.put("percentComplete", task.getPercentageComplete().doubleValue());
                    if (task.getPercentageWorkComplete() != null) taskNode.put("percentWorkComplete", task.getPercentageWorkComplete().doubleValue());
                    taskNode.put("milestone", task.getMilestone());
                    taskNode.put("critical", task.getCritical());
                    taskNode.put("active", task.getActive());
                    taskNode.put("estimated", task.getEstimated());
                    
                    // Work & Cost
                    if (task.getWork() != null) taskNode.put("work", task.getWork().getDuration());
                    if (task.getActualWork() != null) taskNode.put("actualWork", task.getActualWork().getDuration());
                    if (task.getRemainingWork() != null) taskNode.put("remainingWork", task.getRemainingWork().getDuration());
                    
                    if (task.getCost() != null) taskNode.put("cost", task.getCost().doubleValue());
                    if (task.getActualCost() != null) taskNode.put("actualCost", task.getActualCost().doubleValue());
                    if (task.getRemainingCost() != null) taskNode.put("remainingCost", task.getRemainingCost().doubleValue());
                    
                    // Baseline
                    if (task.getBaselineStart() != null) taskNode.put("baselineStart", task.getBaselineStart().toString());
                    if (task.getBaselineFinish() != null) taskNode.put("baselineFinish", task.getBaselineFinish().toString());
                    if (task.getBaselineDuration() != null) taskNode.put("baselineDuration", task.getBaselineDuration().getDuration());
                    if (task.getBaselineCost() != null) taskNode.put("baselineCost", task.getBaselineCost().doubleValue());
                    
                    // Resources & Notes
                    if (task.getResourceNames() != null && !task.getResourceNames().isEmpty()) {
                        taskNode.put("resourceNames", task.getResourceNames());
                    }
                    if (task.getNotes() != null && !task.getNotes().isEmpty()) {
                        taskNode.put("notes", task.getNotes());
                    }
                    if (task.getPriority() != null) {
                        taskNode.put("priority", task.getPriority().getValue());
                    }
                    if (task.getContact() != null) {
                        taskNode.put("contact", task.getContact());
                    }
                    if (task.getHyperlink() != null) {
                        taskNode.put("hyperlink", task.getHyperlink());
                    }
                    
                    tasksNode.add(taskNode);
                }
            }
            
            for (Task task : allTasks) {
                if (task.getPredecessors() != null) {
                    for (Relation pred : task.getPredecessors()) {
                        Task sourceTask = pred.getPredecessorTask();
                        Task targetTask = pred.getSuccessorTask();
                        
                        if (sourceTask != null && targetTask != null && sourceTask.getID() != null && targetTask.getID() != null) {
                            ObjectNode linkNode = mapper.createObjectNode();
                            linkNode.put("source", String.valueOf(sourceTask.getID()));
                            if (sourceTask.getUniqueID() != null) {
                                linkNode.put("sourceUniqueId", String.valueOf(sourceTask.getUniqueID()));
                            }
                            linkNode.put("target", String.valueOf(targetTask.getID()));
                            if (targetTask.getUniqueID() != null) {
                                linkNode.put("targetUniqueId", String.valueOf(targetTask.getUniqueID()));
                            }
                            linkNode.put("type", pred.getType() != null ? pred.getType().toString() : "");
                            if (pred.getLag() != null) {
                                linkNode.put("lag", pred.getLag().getDuration());
                            }
                            linksNode.add(linkNode);
                        }
                    }
                }
            }
            
            root.set("tasks", tasksNode);
            root.set("dependencies", linksNode);
            
            System.out.println(mapper.writeValueAsString(root));
            
        } catch (Exception e) {
            ObjectNode errorNode = mapper.createObjectNode();
            errorNode.put("error", e.getMessage());
            try {
                System.out.println(mapper.writeValueAsString(errorNode));
            } catch (Exception ex) {
                System.out.println("{\"error\": \"Failed to write error JSON\"}");
            }
            System.exit(1);
        }
    }
}
