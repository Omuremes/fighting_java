package com.example.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

import org.springframework.stereotype.Service;

import com.example.model.Todo;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;

@Service
public class TodoService {
    private final Firestore firestore;

    public TodoService(Firestore firestore) {
        this.firestore = firestore;
    }

    public String addTodo(Todo todo) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection("todos").document();
        ApiFuture<WriteResult> result = docRef.set(todo);
        return result.get().getUpdateTime().toString();
    }

    public List<Todo> fetchTodos() throws ExecutionException, InterruptedException {
        List<Todo> todos = new ArrayList<>();
        ApiFuture<QuerySnapshot> query = firestore.collection("todos").get();
        for (QueryDocumentSnapshot document : query.get().getDocuments()) {
            todos.add(document.toObject(Todo.class));
        }
        return todos;
    }

    public String modifyTodo(String id, Todo todo) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection("todos").document(id);
        ApiFuture<WriteResult> result = docRef.set(todo);
        return result.get().getUpdateTime().toString();
    }

    public String removeTodo(String id) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection("todos").document(id);
        ApiFuture<WriteResult> result = docRef.delete();
        return result.get().getUpdateTime().toString();
    }
}