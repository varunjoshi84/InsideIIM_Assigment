const mongoose = require('mongoose');
const User = require('../models/User.model.js');
const jwt = require('jsonwebtoken');
const RegisterController = async function(req, res){
    const {name, email, password} = req.body;
    try{
        const isAlreadyuser = await User.findOne({email});
        if(isAlreadyuser){
            return res.status(409).json({
                message: "User Already Register"
            })
        }
        const user = await User.create({
            name, email, password
        });
        const token = jwt.sign({
            id: user._id,
            email : user.email
        }, process.env.JWT_SECRET, {expiresIn : "7d"});
        return res.status(201).json({
            message: "User Registred Successfully",
            token
        })

    }catch(err){
        console.log(err);
        return res.status(500).json({
            message : "error in signup",
            
        })
        
    }
};

const LoginController = async function(req,res){
    const {email, password} = req.body;
    try{
        const user = await User.findOne({
            email
        }) 
        if(!user){
            return res.status(401).json({
                message : "wrong credintials"
            })
        }
        const isMatch = await user.comparePassword(password)
        if(!isMatch){
            return res.status(401).json({
                message : "Wrong credintials"
            })
        }
        const token = jwt.sign({
            id : user._id,
            email : user.email
        },
    process.env.JWT_SECRET, {
        expiresIn: "7d"
    })
    res.status(200).json({
        message : "Login Successful",
        token
    })
        
    }catch(err){
        return res.status(409).json({
            message : "something went wrong",
         
        });
    }
}

module.exports = {RegisterController, LoginController};