
Sweet Shop Management System

Project Overview

The Sweet Shop Management System is a full-stack web application that allows users to browse and purchase sweets while enabling administrators to manage inventory, stock, and sales. The application follows real-world business logic with secure authentication, structured data handling, and a responsive user interface.


---

Features

User Features

User registration and login

JWT-based authentication

Browse, search, and view available sweets

Add sweets to cart and place orders

Cart-to-database mapping using unique IDs

When items are added to the cart, sweet names are converted into unique Sweet IDs before being stored in the database

This approach ensures data normalization, clear order records, accurate billing, and easy future scalability


View order history


Admin Features

Role-based access control for administrators

Add, update, and delete sweets

Manage inventory and stock levels

Automatic stock quantity updates after successful purchases

View sales and order records


UI and UX

Fully mobile-responsive design

Supports mobile, tablet, and desktop screen sizes

Simple and user-friendly interface


Testing

Backend unit and API testing using Jest

Validation of authentication, inventory, and purchase workflows



---

Tech Stack

Backend

Node.js

Express.js

MongoDB with Mongoose

JWT Authentication

Jest for testing


Frontend

React

HTML

CSS

REST API integration



---

Getting Started

Prerequisites

Node.js

MongoDB

npm or yarn


Backend Setup

1. Navigate to the backend directory


2. Install dependencies

npm install


3. Create a .env file and add the required environment variables


4. Start the backend server

npm run dev



Frontend Setup

1. Navigate to the frontend directory


2. Install dependencies

npm install


3. Start the frontend application

npm start




---

Demo Credentials (For Testing)

Admin Account

Email: admin@tes.com

Password: strongpassword


User Accounts

Email: user@test.com
Password: user123

Email: user@test2.com
Password: user123


These accounts are created only for demonstration and testing purposes.


---

Screenshots

Login Page

Sweets Dashboard

Shopping Cart

Admin Inventory Management

Jest Test Results



---

AI Usage Disclosure

Tools Used

ChatGPT

Gemini

Claude


Usage Details

ChatGPT was used for backend development support including API design, authentication logic, database schema design, and unit testing.

Gemini was used for frontend development assistance including React component structure and API integration.

Claude was used for UI and UX improvement suggestions.


All AI-generated outputs were reviewed, modified, and manually integrated to ensure correctness, originality, and adherence to project requirements.


---

Reflection

AI tools were used as development assistants and not as replacements for manual coding. The final implementation reflects independent problem-solving, practical full-stack development skills, and industry-aligned best practices.
