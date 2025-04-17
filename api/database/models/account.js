import mongoose from "mongoose";
import { PersonSchema } from "./person.js";


const AccountSchema = mongoose.Schema({
    username:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        default:"active",
    },
    person:{
        type:PersonSchema,
        required:true,
    },
    books:{
        type:[],
        default:[],
    },
    balance:{
        type:Number,
        default:Math.random() * 1000
    }
});

export default mongoose.model('Account',AccountSchema);