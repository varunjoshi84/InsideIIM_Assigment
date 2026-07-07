import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'
import { TrendingUp } from 'lucide-react';

function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate()

    const RegisterHandler = async function (e) {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const response = await axios.post('http://127.0.0.1:5000/api/register/', {
                name, email, password
            });
            setMessage(response.data.message);
            navigate("/login")
        } catch (err) {
            console.log(err);
            setMessage(err.response?.data?.message || "something went wrong")
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center px-4 font-sans">
            <div className="w-full max-w-[380px] bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                
                {/* Logo / mark */}
                <div className="flex items-center gap-2.5 mb-6 justify-center">
                    <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 flex items-center justify-center">
                        <TrendingUp className="w-4.5 h-4.5 text-[#00C853]" strokeWidth={2.5} />
                    </div>
                    <span className="text-[#111827] text-xl font-bold tracking-tight">Stockly</span>
                </div>

                <h1 className="text-[#111827] text-lg font-bold mb-1 text-center">Create account</h1>
                <p className="text-[#6B7280] text-xs mb-6 text-center font-medium">Start tracking your portfolio in minutes.</p>

                <form onSubmit={RegisterHandler} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="name" className="text-[#111827] text-xs font-semibold">
                            Full name
                        </label>
                        <input
                            id="name"
                            type="text"
                            name="name"
                            placeholder="Your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm text-[#111827]
                                       outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/5
                                       transition-all placeholder:text-[#6B7280] bg-white"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-[#111827] text-xs font-semibold">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm text-[#111827]
                                       outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/5
                                       transition-all placeholder:text-[#6B7280] bg-white"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-[#111827] text-xs font-semibold">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm text-[#111827]
                                       outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/5
                                       transition-all placeholder:text-[#6B7280] bg-white"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-10 mt-2 rounded-lg bg-[#111827] text-white text-sm font-semibold
                                   hover:bg-black active:bg-black transition-all duration-150 shadow-sm
                                   disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                    >
                        {loading ? "Creating account..." : "Sign up"}
                    </button>
                </form>

                {message && (
                    <p className="mt-4 text-xs text-center font-semibold text-red-500 bg-red-50 py-2 px-3 rounded-lg border border-red-100">
                        {message}
                    </p>
                )}

                <p className="text-center text-xs text-[#6B7280] mt-6 font-medium">
                    Already registered?{" "}
                    <Link to="/login" className="text-[#111827] font-bold hover:underline transition-colors">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default Register