const mongoose = require('mongoose')
const bcrypt = require('bcrypt');
const UserSchema = new mongoose.Schema({
    name : {
        type:String,
        required : true,
    },
    email:{
        type : String,
        required : true,
        unique : true
    },
    password:{
        type:String,
        required:true,
    }
});
UserSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

//compare password 
UserSchema.methods.comparePassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}
const User = mongoose.model('User', UserSchema);
module.exports = User;
