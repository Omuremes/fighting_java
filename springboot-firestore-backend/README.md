# Spring Boot Firestore Backend

This project is a Spring Boot application that integrates with Firebase Firestore to manage Todo items. It provides a RESTful API for creating, retrieving, updating, and deleting Todo entries.

## Project Structure

```
springboot-firestore-backend
├── src
│   ├── main
│   │   ├── java
│   │   │   └── com
│   │   │       └── example
│   │   │           ├── Application.java
│   │   │           ├── controller
│   │   │           │   └── TodoController.java
│   │   │           ├── service
│   │   │           │   └── TodoService.java
│   │   │           └── model
│   │   │               └── Todo.java
│   │   └── resources
│   │       ├── application.properties
│   │       └── firebase-service-account.json
├── pom.xml
└── README.md
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd springboot-firestore-backend
   ```

2. **Configure Firebase:**
   - Create a Firebase project in the Firebase console.
   - Generate a new service account key and download the JSON file.
   - Place the downloaded JSON file in the `src/main/resources` directory and rename it to `firebase-service-account.json`.

3. **Update application.properties:**
   - Configure your Firestore settings and any other necessary properties in `src/main/resources/application.properties`.

4. **Build the project:**
   ```
   mvn clean install
   ```

5. **Run the application:**
   ```
   mvn spring-boot:run
   ```

## Usage

- The API provides endpoints to manage Todo items:
  - `POST /todos` - Create a new Todo
  - `GET /todos` - Retrieve all Todos
  - `PUT /todos/{id}` - Update a Todo by ID
  - `DELETE /todos/{id}` - Delete a Todo by ID

## Dependencies

This project uses Maven for dependency management. The `pom.xml` file includes necessary dependencies for Spring Boot and Firebase Firestore.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.