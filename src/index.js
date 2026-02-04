import dotenv from 'dotenv';
import app from './app.js';
import  connectMongoDb  from './db/connection.js';



dotenv.config({
    path : "./.env"
});

const PORT = process.env.PORT || 8000;

connectMongoDb(process.env.M0NGODB_URL)
.then(app.listen(PORT, () => {console.log(`✅ Server is running on port ${PORT}`)}))

.catch(()=>{
    console.log("Failed to connect to MongoDB database");
    process.exit(1);
})






