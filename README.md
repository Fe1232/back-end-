# Inventory Manager API

<p align="center">
  <strong>REST API for inventory management</strong><br>
  Authentication, users and product management built with Node.js, Express, Prisma and MongoDB.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/Node.js-24.x-green" alt="Node.js 24">
  <img src="https://img.shields.io/badge/Express-5.x-lightgrey" alt="Express 5">
  <img src="https://img.shields.io/badge/Prisma-6.19-2D3748" alt="Prisma 6.19">
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248" alt="MongoDB">
  <img src="https://img.shields.io/badge/license-ISC-yellow" alt="ISC License">
</p>

---

## About

**Inventory Manager API** is a REST API developed to support an inventory management application.

The API provides:

- 🔐 User registration and authentication
- 👤 User account management
- 📦 Product CRUD operations
- 🔑 JWT-based authentication
- 🔒 Authorization based on the authenticated user
- 🔐 Password hashing with bcrypt
- 🗄️ MongoDB persistence through Prisma ORM
- ☁️ Deployment on Microsoft Azure

This repository contains **Version 1.0.0** of the API.

---

## Production

### Base URL

```text
https://inventory-manager-api-fe-g4cjgadneahudhcb.brazilsouth-01.azurewebsites.net
```

The API is currently deployed as an Azure Web App.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 24.x | JavaScript runtime |
| Express 5 | HTTP server and routing |
| Prisma 6.19 | ORM / database access |
| MongoDB | Database |
| JSON Web Token | Authentication |
| bcrypt | Password hashing |
| CORS | Cross-origin requests |
| dotenv | Environment variables |
| TypeScript | Configuration / Prisma configuration |

---

# Authentication

Protected endpoints use **JWT Bearer Authentication**.

After a successful login, the API returns a token:

```json
{
  "user": {
    "id": "64f000000000000000000001",
    "nameStore": "Minha Loja",
    "email": "usuario@email.com"
  },
  "token": "JWT_TOKEN"
}
```

For protected requests, send:

```http
Authorization: Bearer JWT_TOKEN
```

Tokens issued by the API expire after **1 hour**.

---

# API Endpoints

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| `POST` | `/users` | ❌ | Create an account |
| `POST` | `/login` | ❌ | Authenticate a user |
| `DELETE` | `/users/:id` | ✅ | Delete the authenticated user's account |
| `POST` | `/products` | ✅ | Create a product |
| `GET` | `/products` | ✅ | List products belonging to the authenticated user |
| `PUT` | `/products/:id` | ✅ | Update a product |
| `DELETE` | `/products/:id` | ✅ | Delete a product |

> `GET /users` exists in the source code but is currently disabled and therefore is **not part of the exposed V1.0 API**.

---

# Users

## Create account

### `POST /users`

Creates a new user account.

### Request body

```json
{
  "nameStore": "Minha Loja",
  "email": "usuario@email.com",
  "key": "senha123",
  "accountPro": false
}
```

### Fields

| Field | Type | Required | Rules |
|---|---|---:|---|
| `nameStore` | string | ✅ | Cannot be empty |
| `email` | string | ✅ | Must have a valid email format |
| `key` | string | ✅ | Minimum 6 characters |
| `accountPro` | boolean | ✅ | Must be `true` or `false` |

### `201 Created`

```json
{
  "response": "Conta criada com sucesso",
  "user": {
    "id": "64f000000000000000000001",
    "nameStore": "Minha Loja",
    "email": "usuario@email.com",
    "accountPro": false
  }
}
```

The password hash is never returned.

### Possible errors

| Status | Code | Meaning |
|---:|---|---|
| `400` | `ACCOUNT_NAME_REQUIRED` | Store name is missing |
| `400` | `ACCOUNT_EMAIL_REQUIRED` | Email is missing |
| `400` | `ACCOUNT_EMAIL_INVALID` | Invalid email |
| `400` | `ACCOUNT_PASSWORD_TOO_SHORT` | Password has fewer than 6 characters |
| `400` | `ACCOUNT_PRO_INVALID` | `accountPro` is not boolean |
| `409` | `EMAIL_ALREADY_REGISTERED` | Email already exists |
| `500` | `ACCOUNT_CREATE_FAILED` | Account creation failed |

---

## Login

### `POST /login`

Authenticates a user and returns a JWT.

### Request body

```json
{
  "email": "usuario@email.com",
  "key": "senha123"
}
```

### `200 OK`

```json
{
  "user": {
    "id": "64f000000000000000000001",
    "nameStore": "Minha Loja",
    "email": "usuario@email.com"
  },
  "token": "JWT_TOKEN"
}
```

### Possible errors

| Status | Code | Meaning |
|---:|---|---|
| `400` | `LOGIN_EMAIL_REQUIRED` | Email is missing |
| `400` | `LOGIN_EMAIL_INVALID` | Invalid email |
| `400` | `LOGIN_PASSWORD_REQUIRED` | Password is missing |
| `401` | `INVALID_CREDENTIALS` | Email or password is incorrect |
| `500` | `LOGIN_FAILED` | Login failed |

---

## Delete account

### `DELETE /users/:id`

Deletes a user account.

The authenticated user's ID must match the `:id` parameter.

### Headers

```http
Authorization: Bearer JWT_TOKEN
```

### `200 OK`

```json
{
  "message": "Usuário removido com sucesso.",
  "user": {
    "id": "64f000000000000000000001",
    "nameStore": "Minha Loja",
    "email": "usuario@email.com",
    "accountPro": false
  }
}
```

### Possible errors

| Status | Code | Meaning |
|---:|---|---|
| `400` | `USER_ID_REQUIRED` | User ID is missing/empty |
| `400` | `USER_ID_INVALID` | Invalid user ID |
| `401` | `AUTH_TOKEN_MISSING` | Authentication token was not provided |
| `401` | `AUTH_TOKEN_INVALID` | Token is invalid or expired |
| `403` | `USER_DELETE_FORBIDDEN` | User is trying to delete another account |
| `404` | `USER_NOT_FOUND` | User was not found |
| `409` | `USER_DELETE_CONFLICT` | User has related records |
| `500` | `USER_DELETE_FAILED` | Deletion failed |

---

# 📦 Products

Products belong to a user through the `userId` stored in the database.

The API obtains the authenticated user's ID directly from the JWT, so clients **do not need to send `userId` when creating a product**.

---

## Create product

### `POST /products`

Creates a product for the authenticated user.

### Headers

```http
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

### Request body

```json
{
  "nameProduct": "Notebook",
  "category": "Eletrônicos",
  "costPrice": 2500.00,
  "priceToSell": 3299.90,
  "quantity": 10,
  "warningPoint": 3
}
```

### Fields

| Field | Type | Required | Rules |
|---|---|---:|---|
| `nameProduct` | string | ✅ | Cannot be empty |
| `category` | string | ✅ | Cannot be empty |
| `costPrice` | number | ✅ | Must be >= 0 |
| `priceToSell` | number | ✅ | Must be >= 0 |
| `quantity` | integer | ✅ | Must be >= 0 |
| `warningPoint` | integer | ✅ | Must be >= 0 |

### `201 Created`

```json
{
  "response": "Product created successfully!",
  "product": {
    "id": "64f000000000000000000002",
    "nameProduct": "Notebook",
    "category": "Eletrônicos",
    "costPrice": 2500,
    "priceToSell": 3299.9,
    "quantity": 10,
    "warningPoint": 3,
    "userId": "64f000000000000000000001"
  }
}
```

### Possible errors

| Status | Code | Meaning |
|---:|---|---|
| `400` | `PRODUCT_NAME_REQUIRED` | Product name is missing |
| `400` | `PRODUCT_CATEGORY_REQUIRED` | Category is missing |
| `400` | `PRODUCT_COSTPRICE_INVALID` | Invalid cost price |
| `400` | `PRODUCT_PRICETOSELL_INVALID` | Invalid selling price |
| `400` | `PRODUCT_QUANTITY_INVALID` | Invalid quantity |
| `400` | `PRODUCT_WARNINGPOINT_INVALID` | Invalid warning point |
| `400` | `PRODUCT_USERID_INVALID` | Invalid authenticated user ID |
| `401` | `AUTH_TOKEN_MISSING` | Token was not provided |
| `401` | `AUTH_TOKEN_INVALID` | Token is invalid or expired |
| `404` | `PRODUCT_USERID_NOT_FOUND` | Authenticated user does not exist |
| `500` | `PRODUCT_CREATION_FAILED` | Product creation failed |

---

## List products

### `GET /products`

Returns all products belonging to the authenticated user.

### Headers

```http
Authorization: Bearer JWT_TOKEN
```

### `200 OK`

```json
[
  {
    "id": "64f000000000000000000002",
    "nameProduct": "Notebook",
    "category": "Eletrônicos",
    "costPrice": 2500,
    "priceToSell": 3299.9,
    "quantity": 10,
    "warningPoint": 3,
    "userId": "64f000000000000000000001"
  }
]
```

If the authenticated user has no products, the endpoint returns an empty array:

```json
[]
```

### Possible errors

| Status | Code | Meaning |
|---:|---|---|
| `400` | `USER_ID_INVALID` | Invalid authenticated user ID |
| `401` | `AUTH_TOKEN_MISSING` | Token was not provided |
| `401` | `AUTH_TOKEN_INVALID` | Token is invalid or expired |
| `404` | `PRODUCT_USERID_NOT_FOUND` | Authenticated user does not exist |
| `500` | `PRODUCT_FETCH_FAILED` | Products could not be retrieved |

---

## Update product

### `PUT /products/:id`

Updates an existing product.

The product must belong to the authenticated user.

### Headers

```http
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

### Example

```http
PUT /products/64f000000000000000000002
```

### Request body

```json
{
  "nameProduct": "Notebook Gamer",
  "category": "Eletrônicos",
  "costPrice": 3000,
  "priceToSell": 3999.9,
  "quantity": 8,
  "warningPoint": 2
}
```

### `200 OK`

```json
{
  "response": "Product updated successfully!",
  "product": {
    "id": "64f000000000000000000002",
    "nameProduct": "Notebook Gamer",
    "category": "Eletrônicos",
    "costPrice": 3000,
    "priceToSell": 3999.9,
    "quantity": 8,
    "warningPoint": 2,
    "userId": "64f000000000000000000001"
  }
}
```

### Possible errors

| Status | Code | Meaning |
|---:|---|---|
| `400` | `PRODUCT_ID_REQUIRED` | Product ID is missing |
| `400` | `PRODUCT_ID_INVALID` | Invalid product ID |
| `400` | `PRODUCT_NAME_REQUIRED` | Product name is missing |
| `400` | `PRODUCT_CATEGORY_REQUIRED` | Category is missing |
| `400` | `PRODUCT_COSTPRICE_INVALID` | Invalid cost price |
| `400` | `PRODUCT_PRICETOSELL_INVALID` | Invalid selling price |
| `400` | `PRODUCT_QUANTITY_INVALID` | Invalid quantity |
| `400` | `PRODUCT_WARNINGPOINT_INVALID` | Invalid warning point |
| `401` | `AUTH_TOKEN_MISSING` | Token was not provided |
| `401` | `AUTH_TOKEN_INVALID` | Token is invalid or expired |
| `403` | `PRODUCT_UPDATE_FORBIDDEN` | Product belongs to another user |
| `404` | `PRODUCT_ID_NOT_FOUND` | Product does not exist |
| `500` | `PRODUCT_UPDATE_FAILED` | Product update failed |

---

## Delete product

### `DELETE /products/:id`

Deletes a product belonging to the authenticated user.

### Headers

```http
Authorization: Bearer JWT_TOKEN
```

### `200 OK`

```json
{
  "response": "Product deleted successfully!",
  "product": {
    "deletedCount": 1
  }
}
```

### Possible errors

| Status | Code | Meaning |
|---:|---|---|
| `400` | `PRODUCT_ID_REQUIRED` | Product ID is missing |
| `400` | `PRODUCT_ID_INVALID` | Invalid product ID |
| `400` | `USER_ID_INVALID` | Invalid authenticated user ID |
| `401` | `AUTH_TOKEN_MISSING` | Token was not provided |
| `401` | `AUTH_TOKEN_INVALID` | Token is invalid or expired |
| `403` | `PRODUCT_DELETE_FORBIDDEN` | Product does not belong to the authenticated user |
| `500` | `PRODUCT_DELETE_FAILED` | Product deletion failed |

---

# Data Models

## User

```text
User
├── id: String (MongoDB ObjectId)
├── nameStore: String
├── email: String (unique)
├── key: String (hashed password)
├── accountPro: Boolean
└── products: Product[]
```

## Product

```text
Product
├── id: String (MongoDB ObjectId)
├── nameProduct: String
├── category: String
├── costPrice: Float
├── priceToSell: Float
├── quantity: Int
├── warningPoint: Int
└── userId: String
```

### Relationship

```text
User 1 ─────────── N Products
```

Each product is associated with one user through `userId`.

---

# Running locally

## Requirements

- Node.js 24.x
- MongoDB database
- npm

## Installation

```bash
git clone <repository-url>
cd back-end
npm install
```

## Environment variables

Create a `.env` file:

```env
DATABASE_URL="your-mongodb-connection-string"
JWT_SECRET="your-secret-key"
PORT=8000
```

> Never commit `.env` or database credentials to Git.

## Start

```bash
npm start
```

The server uses `PORT` when provided and otherwise defaults to `8000`.

---

# Testing with Postman

The API can be tested using Postman.

Recommended flow:

```text
1. POST /users
       ↓
2. POST /login
       ↓
3. Copy token
       ↓
4. Add Authorization: Bearer <token>
       ↓
5. POST /products
       ↓
6. GET /products
       ↓
7. PUT /products/:id
       ↓
8. DELETE /products/:id
```

---

# OpenAPI

A machine-readable OpenAPI specification is included in:

```text
docs/openapi.yaml
```

The specification can be imported into tools such as Swagger UI, Swagger Editor, Postman and other API clients/documentation platforms.

---

# Security

The API implements several security measures:

- Passwords are hashed with bcrypt before being stored.
- Password hashes are not returned by account creation or user deletion.
- JWT is used to authenticate protected endpoints.
- JWT tokens expire after one hour.
- Product operations use the authenticated user's ID.
- Users cannot delete another user's account.
- Users cannot update or delete products belonging to another user.
- Environment variables are kept outside version control.

---

# Deployment

The production API is hosted on **Microsoft Azure App Service**.

The project uses GitHub Actions for continuous deployment from the `main` branch.

```text
GitHub
   │
   │ push
   ▼
GitHub Actions
   │
   │ build + test
   ▼
Azure App Service
   │
   ▼
Inventory Manager API
```

---

# Roadmap

Possible future improvements:

- [ ] Interactive Swagger UI hosted with the API
- [ ] Automated API tests
- [ ] Product pagination
- [ ] Product search and filtering
- [ ] Inventory movement/history
- [ ] Improved role/permission system
- [ ] Account plan management
- [ ] API rate limiting
- [ ] Request validation middleware
- [ ] API versioning (`/api/v2`)

---

## Version

**Current version: 1.0.0**

This documentation describes the API behavior implemented in the V1.0 source code.

---

<p align="center">
  Made with Node.js, Express, Prisma and MongoDB.
</p>
