import org.mpxj.TaskField;
import org.mpxj.FieldType;
import org.mpxj.Task;

public class TestMPXJ {
    public static void main(String[] args) {
        System.out.println("Testing TaskField in MPXJ");
        try {
            int count = 0;
            for (TaskField f : TaskField.values()) {
                String name = f.name();
                if (name.matches("^(TEXT|NUMBER|FLAG|COST|DATE|DURATION|FINISH|START|OUTLINE_CODE|ENTERPRISE_).*\\d+$")) {
                    continue;
                }
                if (count < 10) {
                    System.out.println(name + " -> " + f.getDataType());
                }
                count++;
            }
            System.out.println("Total standard fields: " + count);
        } catch(Throwable t) {
            t.printStackTrace();
        }
    }
}
