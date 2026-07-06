import React from 'react'
import { useState } from 'react'
import axios from 'axios';
import {Link, useNavigate } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();
    const LoginHandler = async function(e){
        e.preventDefault();
        try{
        const response = await axios.post('http://127.0.0.1:5000/api/login/', {
            email, password
        })
        //response
       setMessage(response.data.message)
        localStorage.setItem("token", response.data.token);
        navigate("/")
    }catch(err){
        console.log(err);
        console.log(err.response)
        setMessage(err.response?.data?.message || "something went wrong")
    }
    }
  return (
   <>
    <form action="" onSubmit={LoginHandler} className='m-2 border-2 h-auto w-auto p-4'>
        email : <input type="email" name='email' value={email} onChange={(e)=>setEmail(e.target.value)} className='border-2 rounded-3xl'/> <br></br>
        password : <input type="password"  name='password' value={password} onChange={(e)=>setPassword(e.target.value)} className='border-2 rouned-3xl' /><br></br>
        <button type='submit' className='border-2 rouned-3xl bg-amber-400' >Login</button>
    </form>
    <br></br>
   <div>
    <h1>Create an Account</h1>
    <Link to="/register">Register</Link>
    </div>
    {message && <h2>{message}</h2>}
   </>
  )
}

export default Login
