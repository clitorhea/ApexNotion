
public with sharing class NotionConfig {
    public class Cfg {
        public String apiVersion;
        public String defaultDbId;
    }

     private static Cfg cached;

    public static Cfg get() {
        if (cached != null) return cached;

        // Resolve environment – simplest: by MyDomain / OrgId / or a CMDT “Active__c = true”
        // Example: pick the active Notion integration row
        Notion__mdt row = [
            SELECT Api_Version__c, dbid__c
            FROM Notion__mdt
            WHERE DeveloperName = 'Default_Notion_DB'
            LIMIT 1
        ];

        cached = new Cfg();
        cached.apiVersion = row.Api_Version__c;
        cached.defaultDbId = row.dbid__c;
        return cached;
    }
}