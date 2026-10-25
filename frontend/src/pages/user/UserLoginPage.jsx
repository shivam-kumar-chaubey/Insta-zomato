import React from 'react'
import axios from 'axios';
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from 'react-toastify';

const UserLoginPage = () => {

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogin() {
    try {
      await axios.post(
        'http://localhost:3000/api/auth/user/login',
        {
          email: email,
          password: password
        },
        { withCredentials: true }
      );
      navigate(location.state?.from || "/", { replace: true });
      toast.success("Login successful!");

    } catch (err) {
      console.error(err);
      console.log(err.response?.data);
      toast.error("Invalid email or password!");
    }
  }

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-badge">
          User Access
        </div>

        <h1 className="auth-title">
          Welcome back
        </h1>

        <p className="auth-subtitle">
          Sign in to continue.
        </p>

        <div className="auth-form">

          <div className="auth-field">
            <label>Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className="auth-submit"
            onClick={handleLogin}
          >
            Login
          </button>

        </div>

        <div className="auth-link-row">
          <span>Don't have an account?</span>

          <Link to="/user/register" className="auth-link">
            Register
          </Link>
        </div>

      </div>

    </div>
  );
};

export default UserLoginPage
