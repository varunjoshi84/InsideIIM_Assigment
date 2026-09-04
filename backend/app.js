const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: process.env.VITE_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./src/routes/Auth.routes.js');
const researchRoutes = require('./src/routes/Research.routes.js');

app.get('/', (req, res) => {
  res.send('backend is running');
});
app.get('/health', (req,res)=>{
  res.send(`Stockly Health: Working \n time : ${new Date().toLocaleTimeString()}`)
});
app.use('/api', authRoutes);
app.use('/api', researchRoutes);

module.exports = app;