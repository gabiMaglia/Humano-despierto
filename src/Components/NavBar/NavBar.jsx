import { React, useState } from "react";
import "./navbar.css";
import { FaFacebookF, FaInstagram, FaWhatsapp, FaBars } from "react-icons/fa";
import { NavLink } from "react-router-dom";

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar container-fluid navbar-expand-lg navbar-light bg-transparent sticky-top w-100  ">
      <a href="#top" className="navbar-brand logo ">
        Logo
      </a>
      <button
        className="navbar-toggler "
        type="button"
        aria-label="Toggle navigation"
        onClick={handleToggle}
      >
        <FaBars />
      </button>
      <div
        className={`collapse navbar-collapse ${isOpen ? "show" : ""}`}
        id="navbarNav"
      >
        <ul className=" navbar-nav">
          <li className="nav-item">
            <NavLink to="/" className="nav-link">
              Inicio
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/sobre-mi" className="nav-link">
              Acerca de mi
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/cursos" className="nav-link">
              Cursos
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/mutanta" className="nav-link">
              Mutanta
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/contacto" className="nav-link">
              Contacto
            </NavLink>
          </li>
        </ul>
        <ul className="navbar-nav">
          <li className="nav-item">
            <NavLink to="#" className="nav-link social-icon">
              <FaFacebookF />
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="#" className="nav-link social-icon">
              <FaInstagram />
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="#" className="nav-link social-icon">
              <FaWhatsapp />
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default NavBar;
