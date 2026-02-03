import { useContext, useState, useEffect } from 'react'
import UserContext from '../context/UserContext'
import { useNavigate } from "react-router-dom"
import christTeachingBg from '../assets/Christ_teaching.jpg'
import '../styling/profile.css'

const Profile = () => {
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add('profile-route')
    return () => document.body.classList.remove('profile-route')
  }, [])

  return (
    <>
      <div
        className="profile-page-bg"
        style={{ backgroundImage: `url(${christTeachingBg})` }}
        aria-hidden="true"
      />
      <div className="profile-page">
        <div className="profile-content">Profile</div>
      </div>
    </>
  )
}

export default Profile