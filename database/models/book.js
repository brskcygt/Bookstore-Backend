import mongoose from "mongoose";
import { AuthorSchema } from './author.js';

const BookSchema = mongoose.Schema({
    ISBN:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    author:{
        type:AuthorSchema,
        required:true,
    },
    subject:{
        type:String,
        required:true,
    },
    summary:{
        type:String,
        required:false,
    },
    publisher:{
        type:String,
        required:true,
    },
    language:{
        type:String,
        required:true,
    },
    numberOfPages:{
        type:Number,
        required:true,
    },
    bookImg:{
        type:String,
        required:true,
    },
    price:{
        type:Number,
        required:true,
    },
    format:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        default:"Available"
    },
    dateOfPurchase:{
        type:Date,
        default:Date.now,
    },
    publicationDate:{
        type:Number,
        required:true,
    },
});

export default mongoose.model("Book",BookSchema);