require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require("path");
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api');
 
const app = express();

const PORT = process.env.PORT



// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors ({
  origin: [
     "https://lcrng.com",
      "https://www.lcrng.com"
  ],
  credentials: true,
  methods:["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "x-admin-token"]
}))
app.use(express.json());

//---Routes-------------------------------------------
app.use("/api", apiRoutes);
app.get("/", (req, res)=> {
  res.send("LCR Backend API is running...");
});


// ── Connect to MongoDB then start server ──────────────────────────────────────
async function startServer(){
  try {
     
    await mongoose.connect(process.env.MONGODB_URI)
  
    
    // console.log("Connected to MongoDB successfully.");
    app.listen(PORT, () => {
      console.info(`Server is running on port ${PORT}`);
    } )
  
  }catch(err) {
      console.error('Mongoose unable to connect', err.message);
    }
}

startServer();