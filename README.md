# ShareSphere MVP

An AI-Powered Hyperlocal Resource & Skill Exchange Network.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or MongoDB Atlas)

### Backend Setup
1. Navigate to the backend directory:
   `cd backend`
2. Install dependencies:
   `npm install`
3. Configure Environment Variables:
   Create a `.env` file in `backend/` and add:
   `MONGO_URI=mongodb://localhost:27017/sharesphere`
   `JWT_SECRET=supersecret_hackathon_key`
4. Start the backend server (runs on port 5000):
   `npm run dev`

### Frontend Setup
1. Navigate to the frontend directory:
   `cd frontend`
2. Install dependencies:
   `npm install`
3. Start the development server:
   `npm run dev`

---

## Architecture & UI Component Breakdown

### Frontend Components (React + Tailwind CSS v4)
- **Navbar (`src/components/Navbar.jsx`)**: Global navigation with modern Tailwind styling and Lucide icons.
- **Home (`src/pages/Home.jsx`)**: The explore hub displaying nearby resources and an interactive Mapbox/Leaflet placeholder area.
- **Dashboard (`src/pages/Dashboard.jsx`)**: Evaluates and displays the user's Community Impact Score and Environmental contributions (CO2 saved, resources shared).
- **Auth (`src/pages/Auth.jsx`)**: Registration UI with modern glassmorphism and gradient aesthetic.

### Backend API Routes (Node + Express)
- **`POST /api/auth/register`**: Register a new user and initialize their Trust Model and location data.
- **`POST /api/resources`**: Post a resource. Triggers **AI Match Engine** to instantly suggest matches to active nearby requesters using Mongo 2D spatial queries.
- **`GET /api/resources/match`**: Smart matching endpoint.
- **`PUT /api/transactions/:id/complete`**: Finalizes a skill/item barter and automatically assigns **Community Impact Score (CIS)** metric points.

---

## Sample Data & Flow
To verify the platform flow during the hackathon:
1. Run both frontend and backend dev servers.
2. Open `http://localhost:5173/`
3. The Home page comes pre-populated with **Sample MVP Data** (e.g. "React JS Tutoring", "Power Drill") to immediately demonstrate the UI to judges.
4. Interact with the Dashboard to see gamified scoring dynamics.
