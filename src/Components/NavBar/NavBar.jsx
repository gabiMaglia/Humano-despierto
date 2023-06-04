import { React, useState } from "react";
import "./navbar.css";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import logo from "../../assets/img/IALOGOS/3.png";

const NavBar = (props) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav
      id="navbar"
      className="container-fluid navbar-expand-lg navbar-dark  g-0 m-0 p-0 "
    >
      <div className="navCont ">
        <button
          className="navbar-toggler g-0 p-0 m-0"
          type="button"
          aria-label="Toggle navigation"
          onClick={handleToggle}
        >
          <span class="navbar-toggler-icon g-0 p-0 m-0 w-100 "></span>
        </button>

        <a className="navbar-brand logo" href="#top">
          <img id="imgLogo" src={logo} alt="" />
        </a>

        <ul className="navbar-nav d-flex flex-row p-3 social">
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

      <div
        className={`collapse navbar-collapse ${isOpen ? "show" : ""}`}
        id="navbarNav"
      >
        <ul className="navbar-nav local-nav">
          <li className="nav-item">
            <NavLink to="/" onClick={handleToggle} className="nav-link">
              Inicio
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink onClick={handleToggle} to="/cursos" className="nav-link">
              Cursos
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink onClick={handleToggle} to="/charlas" className="nav-link">
              Charlas Gratis
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink onClick={handleToggle} to="/sobre-mi" className="nav-link">
              Acerca de mi
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink onClick={handleToggle} to="/mutanta" className="nav-link">
              Mutanta
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink onClick={handleToggle} to="/contacto" className="nav-link">
              Contacto
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default NavBar;
