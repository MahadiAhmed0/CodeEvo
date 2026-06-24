package com.codeevo;

import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;

public class WipeFiles {
    public static void main(String[] args) {
        try (MongoClient mongoClient = MongoClients.create("mongodb://localhost:27017")) {
            MongoDatabase database = mongoClient.getDatabase("CodeEvo");
            database.getCollection("project_code_files").drop();
            System.out.println("✅ SUCCESSFULLY CLEARED CORRUPTED FILES");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
