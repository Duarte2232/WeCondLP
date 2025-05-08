import React from 'react';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="service-provider-portal">
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
};

export default Layout; 