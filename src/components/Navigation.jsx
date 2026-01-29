import React from 'react';

const Navigation = () => {
    return (
        <nav className="navbar view-padding">
            <div className="logo">RDB</div>
            <div className="nav-links">
                <a href="#work">Work</a>
                <a href="#info">Info</a>
                <a href="#contact">Contact</a>
            </div>
            <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
        }
        .logo {
          font-weight: 900;
          font-size: 1.5rem;
        }
        .nav-links {
          display: flex;
          gap: 40px;
        }
        .nav-links a {
          color: #fff;
          text-decoration: none;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.6;
          transition: opacity 0.3s ease;
        }
        .nav-links a:hover {
          opacity: 1;
        }
      `}</style>
        </nav>
    );
};

export default Navigation;
