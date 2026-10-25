import React from 'react'
import { Link } from 'react-router-dom'
import './AuthPage.css'

const AuthPage = ({
  title,
  subtitle,
  badge,
  linkText,
  linkTo,
  helperText,
  roleSwitch,
  children,
  submitLabel,
  onSubmit,
})=>{
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-badge">{badge}</div>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>

        {roleSwitch && (
          <div className="auth-role-switch">
            <Link className="auth-role-link" to="/user/register">
              Register as normal user
            </Link>
            <Link className="auth-role-link" to="/food-partner/register">
              Register as food partner
            </Link>
          </div>
        )}

        <form className="auth-form" onSubmit={onSubmit}>
          {children}

         <button className="auth-submit" type="submit">
  {submitLabel}
</button>
        </form>

        <div className="auth-link-row">
          <span>{helperText}</span>
          <Link className="auth-link" to={linkTo}>
            {linkText}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
