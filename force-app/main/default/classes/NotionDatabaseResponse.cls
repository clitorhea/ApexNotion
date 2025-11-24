public with sharing class NotionDatabaseResponse {
    public String id;
    public List<Title> title;
    public List<Object> description;
    public Parent parent;
    @AuraEnabled public Boolean is_inline;
    @AuraEnabled public Boolean is_locked;
    public Datetime created_time;
    public Datetime last_edited_time;
    public List<DataSource> data_sources;
    public String url;
    public String request_id;

    public class Title {
        public String type;
        public Text text;
        public String plain_text;
        public String href;
    }
    public class Text {
        public String content;
        public Object link;
    }

    public class Parent {
        public String type;
        public String page_id;
    }

    public class DataSource {
        public String id;
        public String name;
    }
}