public with sharing class NotionPageWrapper {
    public Parent parent;
        public Map<String, Property> properties;
        public List<Block> children;
        
        public class Parent {
            public String database_id;
        }
        
        public class Property {
            public List<RichText> title;
            // To extend: Add 'rich_text', 'select', 'date' etc here
        }

        public class Block {
            public String object_type = 'block'; // Reserved word 'object' workaround
            public String type;
            public TextContent paragraph;
            public TextContent heading_2;
            // To extend: Add 'image', 'to_do', 'bulleted_list_item' here
            
            public Block(String type) {
                this.type = type;
            }
        }

        public class TextContent {
            public List<RichText> rich_text;
        }

        public class RichText {
            public String type = 'text';
            public TextData text;
            
            public RichText(String content) {
                this.text = new TextData();
                this.text.content = content;
            }
        }

        public class TextData {
            public String content;
        }
}