import React from "react";
import "./footer.css";

import {
  FaFacebookF,
  FaTwitter,
  FaGoogle,
  FaInstagram,
  FaLinkedin,
  FaGithub,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
const Footer = () => {
  return (
    <>
      {/* <!-- Footer --> */}
      <footer className="text-center text-lg-start text-muted  ">
        {/* <!-- Section: Social media --> */}
        <section className="d-flex justify-content-center justify-content-lg-between p-4  border-bottom">
          {/* <!-- Left --> */}
          <div className="me-5 d-none d-lg-block">
            <span>Podes encontrarme:</span>
          </div>
          {/* <!-- Left --> */}

          {/* <!-- Right --> */}
          <div>
            <a href="/" className="me-4 text-reset">
              <FaFacebookF />
            </a>
            <a href="/" className="me-4 text-reset">
              <FaTwitter />
            </a>
            <a href="/" className="me-4 text-reset">
              <FaGoogle />
            </a>
            <a href="/" className="me-4 text-reset">
              <FaInstagram />
            </a>
            <a href="/" className="me-4 text-reset">
              <FaLinkedin />
            </a>
            <a href="/" className="me-4 text-reset">
              <FaGithub />
            </a>
          </div>
          {/* <!-- Right --> */}
        </section>
        {/* <!-- Section: Social media --> */}

        {/* <!-- Section: Links  --> */}
        <section className="">
          <div className="text-center text-md-start mt-5">
            {/* <!-- Grid row --> */}
            <div className="row mt-3 d-flex">
              {/* <!-- Grid column --> */}
              <div className="col-md-3 col-lg-4 col-xl-3 mx-auto mb-4">
                {/* <!-- Content --> */}
                <h6 className="text-uppercase fw-bold mb-4">
                  <i className="fas fa-gem me-3"></i>Quien soy?
                </h6>
                <p>
                  Me dedico a Lorem ipsum dolor sit amet consectetur adipisicing
                  elit. Ea officiis error, iste dolorum tempora nulla nostrum
                  nihil nam quasi doloremque expedita in quia sequi tenetur odit
                  nobis alias ipsa? Maxime..
                </p>
              </div>
              {/* <!-- Grid column --> */}

              {/* <!-- Grid column --> */}
              <div className="col-md-3 col-lg-2 col-xl-2 mx-auto mb-4">
                {/* <!-- Links --> */}
                <h6 className="text-uppercase fw-bold mb-4">Mapa del sitio</h6>
                <ul className="navbar-nav">
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
              </div>
              {/* <!-- Grid column --> */}

              {/* <!-- Grid column --> */}
              <div className="col-md-4 col-lg-3 col-xl-3 mx-auto mb-md-0 mb-4">
                {/* <!-- Links --> */}
                <h6 className="text-uppercase fw-bold mb-4">Contacto</h6>
                <p>
                  <i className="fas fa-home me-3"></i> Rosario, Santa Fe, Arg.
                </p>
                <p>
                  <i className="fas fa-envelope me-3"></i>
                  info@example.com
                </p>
                <p>
                  <i className="fas fa-phone me-3"></i> + 01 234 567 88
                </p>
              </div>
              {/* <!-- Grid column --> */}
            </div>
            {/* <!-- Grid row --> */}
          </div>
        </section>
        {/* <!-- Section: Links  --> */}

        {/* <!-- Copyright --> */}
        <div
          className="text-end p-4"
          // style="background-color: rgba(0, 0, 0, 0.05);"
        >
          © 2023 Copyright:
          <em> Soy Humano Despierto</em>
        </div>
        {/* <!-- Copyright --> */}
      </footer>
      {/* <!-- Footer --></>; */}
    </>
  );
};

export default Footer;
