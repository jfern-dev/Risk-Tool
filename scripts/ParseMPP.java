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
                    taskNode.put("id", String.valueOf(task.getID()));
                    taskNode.put("name", task.getName());
                    
                    if (task.getStart() != null) {
                        taskNode.put("start", task.getStart().toString());
                    } else {
                        taskNode.putNull("start");
                    }
                    
                    if (task.getFinish() != null) {
                        taskNode.put("finish", task.getFinish().toString());
                    } else {
                        taskNode.putNull("finish");
                    }
                    
                    if (task.getDuration() != null) {
                        taskNode.put("duration", task.getDuration().getDuration());
                    } else {
                        taskNode.put("duration", 0.0);
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
                            linkNode.put("target", String.valueOf(targetTask.getID()));
                            linkNode.put("type", pred.getType() != null ? pred.getType().toString() : "");
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
