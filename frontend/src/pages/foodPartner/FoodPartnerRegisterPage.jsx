// import React from 'react';
// import AuthPage from '../../components/AuthPage';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';

// const FoodPartnerRegisterPage = () => {
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const businessName = e.target.businessName.value;
//     const contactName = e.target.contactName.value;
//     const phone = e.target.phone.value;
//     const email = e.target.email.value;
//     const password = e.target.password.value;
//     const address = e.target.address.value;

//     try {
//       const response = await axios.post(
//         'http://localhost:3000/api/auth/foodPartner/register',
//         {
//           businessName,
//           contactName,
//           phone,
//           email,
//           password,
//           address,
//         },
//         {
//           withCredentials: true,
//         }
//       );

//       console.log(response.data);

//       toast.success('Registration successful!');

//       navigate('/create-food');

//     } catch (error) {
//       console.error('Error registering food partner:', error);

//       toast.error(
//         error.response?.data?.message || 'Registration failed!'
//       );
//     }
//   };

//   return (
//     <AuthPage
//       badge="Food partner"
//       title="Register your kitchen"
//       subtitle="List your dishes, manage orders, and grow with a clean partner dashboard."
//       linkText="Sign in"
//       linkTo="/food-partner/login"
//       helperText="Already partnered with us?"
//       roleSwitch
//       submitLabel="Create partner account"
//       onSubmit={handleSubmit}
//     >
//       <div className="auth-field">
//         <label htmlFor="businessName">Business name</label>
//         <input
//           id="businessName"
//           name="businessName"
//           type="text"
//           placeholder="Your restaurant or cafe name"
//           required
//         />
//       </div>

//       <div className="auth-field">
//         <label htmlFor="contactName">Contact name</label>
//         <input
//           id="contactName"
//           name="contactName"
//           type="text"
//           placeholder="Person in charge"
//           required
//         />
//       </div>

//       <div className="auth-field">
//         <label htmlFor="phone">Phone number</label>
//         <input
//           id="phone"
//           name="phone"
//           type="tel"
//           placeholder="Enter phone number"
//           required
//         />
//       </div>

//       <div className="auth-field">
//         <label htmlFor="email">Email address</label>
//         <input
//           id="email"
//           name="email"
//           type="email"
//           placeholder="you@example.com"
//           required
//         />
//       </div>

//       <div className="auth-field">
//         <label htmlFor="password">Password</label>
//         <input
//           id="password"
//           name="password"
//           type="password"
//           placeholder="Create a password"
//           required
//         />
//       </div>

//       <div className="auth-field">
//         <label htmlFor="address">Address</label>
//         <textarea
//           id="address"
//           name="address"
//           rows="3"
//           placeholder="Business address"
//           required
//         />
//       </div>
//     </AuthPage>
//   );
// };

// export default FoodPartnerRegisterPage;

import React from 'react';
import AuthPage from '../../components/AuthPage';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const FoodPartnerRegisterPage = () => {
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const businessName = e.target.businessName.value;
    const contactName = e.target.contactName.value;
    const phone = e.target.phone.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const address = e.target.address.value;

    try {
      const response = await axios.post(
        'http://localhost:3000/api/auth/foodPartner/register',
        {
          businessName,
          contactName,
          phone,
          email,
          password,
          address,
        },
        {
          withCredentials: true,
        }
      );

      toast.success(
        response.data.message || 'Registration successful!'
      );

      navigate('/create-food');
    } catch (error) {
      console.error(
        'Food partner registration error:',
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message ||
          'Registration failed! Please try again.'
      );
    }
  };

  return (
    <AuthPage
      badge="Food partner"
      title="Register your kitchen"
      subtitle="List your dishes, manage orders, and grow with a clean partner dashboard."
      linkText="Sign in"
      linkTo="/food-partner/login"
      helperText="Already partnered with us?"
      roleSwitch
      submitLabel="Create partner account"
      onSubmit={handleSubmit}
    >
      <div className="auth-field">
        <label htmlFor="businessName">Business name</label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          placeholder="Your restaurant or cafe name"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="contactName">Contact name</label>
        <input
          id="contactName"
          name="contactName"
          type="text"
          placeholder="Person in charge"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="Enter phone number"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Create a password"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="address">Address</label>
        <textarea
          id="address"
          name="address"
          rows="3"
          placeholder="Business address"
          required
        />
      </div>
    </AuthPage>
  );
};

export default FoodPartnerRegisterPage;