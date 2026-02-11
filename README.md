# 101213539_lab_test1_chat_app

This is a real-time chat application built for COMP3133 Lab Test 1.

The app allows users to create an account, log in, join chat rooms, and send private messages. Messages are stored in MongoDB and communication happens in real time using Socket.IO.

The goal of this project was to practice building a full stack application with authentication, database integration, and live messaging.

---

## Features

- User signup and login
- JWT authentication
- Room chat
- Private messaging (1-to-1)
- Online users list
- Typing indicator
- Messages saved in MongoDB

---

## Technologies Used

Backend:
- Node.js
- Express
- MongoDB (Mongoose)
- Socket.IO
- bcryptjs
- jsonwebtoken

Frontend:
- HTML
- CSS
- JavaScript

---

## How to Run

Clone the repo:

git clone https://github.com/bliyu/101213539_lab_test1_chat_app.git

Go into the folder:

cd 101213539_lab_test1_chat_app

Install packages:

npm install

Create a `.env` file and add:

MONGODB_URI=mongodb://blen:123456@127.0.0.1:27017/chat_app?authSource=admin
PORT=3000


Start the server:

npm run dev

Open in browser:

http://localhost:3000

---

## Author

Blen Kebede Abebe  
Student ID: 101213539  
George Brown College
