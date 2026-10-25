import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthPage from "../../components/AuthPage";

const FoodPartnerLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.warning("Please enter email and password");
      return;
    }

    try {
      await axios.post(
        "http://localhost:3000/api/auth/foodPartner/login",
        {
          email,
          password,
        },
        { withCredentials: true }
      );

      toast.success("Login successful!");

      navigate("/create-food");

    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Invalid email or password"
      );
    }
  };

  return (
    <AuthPage
      badge="Partner portal"
      title="Welcome back"
      subtitle="Pick up where you left off and keep your service moving smoothly."
      linkText="Register"
      linkTo="/food-partner/register"
      helperText="Need a partner account?"
      submitLabel="Sign in"
      onSubmit={handleLogin}
    >
      <div className="auth-field">
        <label htmlFor="email">Email address</label>

        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password">Password</label>

        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </AuthPage>
  );
};

export default FoodPartnerLoginPage;