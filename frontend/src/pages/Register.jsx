import { useEffect } from 'react';
import { useState } from 'react';
import {Link, useNavigate } from 'react-router-dom';
import axios from 'axios'
function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const[message, setMessage] = useState("");
    const navigate = useNavigate()
  const RegisterHandler = async function (e) {
    e.preventDefault();
   
   try{
    const response = await axios.post('http://127.0.0.1:5000/api/register/', {
        name,email,password
    });
    setMessage(response.data.message);
    navigate("/login")
   }catch(err){
    console.log(err);

   }
    }
  return (
   <>
      <div className='min-h-screen flex items-center justify-center bg-gray-100'>
     <div className='bg-white p-8 rounded-lg shadow-lg w-full max-w-md'>
       <h1 className='text-3xl font-bold text-center mb-6 text-gray-800'>SignUp</h1>
       <form onSubmit={RegisterHandler}>
         <div className='mb-4'>
           <label className='block text-gray-700 font-semibold mb-2'>Name:</label>
           <input type="text" name="name" value={name} onChange={(e)=>setName(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
         </div>
         <div className='mb-4'>
           <label className='block text-gray-700 font-semibold mb-2'>Email:</label>
           <input type="text" name="email" value={email} onChange={(e)=>setEmail(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
         </div>
         <div className='mb-6'>
           <label className='block text-gray-700 font-semibold mb-2'>Password:</label>
           <input type='password' name='password' value={password} onChange={(e)=>setPassword(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
         </div>
         <button type="submit" className='w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200'>SignUp</button>
       </form>
       {message && <h1>{message}</h1>}
     </div>
     <div>
        <h2>Already Registered</h2>
    <Link to="/login">Login</Link>
     </div>
   </div>
   </>
  )
}
export default Register
