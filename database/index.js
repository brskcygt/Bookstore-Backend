import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const database = () => {
    mongoose.connect(process.env.MONGO_URI, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    }).then(() => {
        console.log('MongoDB connected');
    }).catch(err => {
        console.log(err.message);
    })
}

export default database;