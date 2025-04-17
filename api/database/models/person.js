import mongoose from "mongoose";
import { AddressSchema } from "./address.js";

export const PersonSchema = mongoose.Schema({
    firstName:{
        type:String,
        required:true,
    },
    lastName:{
        type:String,
        required:true,
    },
    address:{
        type:AddressSchema,
        required:false
    },
    email:{
        type:String,
        required:true,
    },
    phone:{
        type:String,
        required:true,
    }

});

export default mongoose.model('Person',PersonSchema);