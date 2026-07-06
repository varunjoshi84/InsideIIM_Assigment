const dotenv = require('dotenv');
dotenv.config();
const connectDb = require('../backend/src/config/db');
connectDb();
const app = require('./app');

const PORT = process.env.PORT;
console.log(PORT);
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});