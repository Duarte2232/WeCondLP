import { useState } from 'react'
import {Hero, Passos, CallToAction, Features, Login, DashGestor} from "./components"
import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/auth';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <div className='container'>
              <Hero/> 
              <Features />
              <Passos/>
              <CallToAction/>
            </div>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/dashgestor" element={<DashGestor />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
