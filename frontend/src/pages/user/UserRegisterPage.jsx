import React from 'react'
import AuthPage from '../../components/AuthPage'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify';

const UserRegisterPage = () => {

const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();

  const fullname = e.target.name.value;
  const email = e.target.email.value;
  const password = e.target.password.value;

  try {
    const res = await axios.post(
      "http://localhost:3000/api/auth/user/register",
      {
        fullname,
        email,
        password,
      },
      {
        withCredentials:true
      });

    console.log(res.data);
     navigate("/");
     toast.success("Registration successful!");

  } catch (err) {
    console.log(err.response?.data);
    toast.error(err.response?.data?.message || "Registration failed");
  }

 
};
  return (
    <AuthPage
  badge="User access"
  title="Create your account"
  subtitle="Join the platform to discover fresh meals and simple ordering."
  linkText="Sign in"
  linkTo="/user/login"
  helperText="Already have an account?"
  roleSwitch
  submitLabel="Create account"
  onSubmit={handleSubmit}
>
      <div className="auth-field">
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Your full name"
        />
      </div>
      <div className="auth-field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Create a password"
        />
      </div>
    </AuthPage>
  )
}

export default UserRegisterPage
