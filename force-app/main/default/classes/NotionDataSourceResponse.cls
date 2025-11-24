public with sharing class NotionDataSourceResponse {

    public List<Result> results; 
    public String next_cursor;
    public boolean has_more; 
    public String type; 
    public String request_id; 

    public class Result{
        public String id ; 
        public String createTime; 
        public String lastUpdated; 
        public Parent parent; 
        public Property properties; 
        public String url; 
        public String public_url; 
    }

   
    public class Parent{
        public String type ;
        public String data_source_id; 
        public String database_id; 
    }

    public class Property{
        public Name Name; 
    }

    public class Name {
        public String id; 
        public String type; 
        public List<Title> title; 

    }

    public class Title{
        public String type; 
        public Text text; 
        public String plain_text; 
        public String href; 
    }
    
    public class Text {
        public String content; 
        public String link; 
    }
}