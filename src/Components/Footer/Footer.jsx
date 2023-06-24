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
import { Button } from "@mui/material";
const Footer = () => {
  return (
    <>
      {/* <!-- Footer --> */}
      <footer className="text-center text-lg-start text-muted  d-flex flex-column">
        {/* <!-- Section: Social media --> */}
        <section className=" d-flex text-white  justify-content-lg-between  p-4 mb-2 border-bottom">
          {/* <!-- Left --> */}
          <div className="d-flex w-100 justify-content-between ">
            <a href="/" className=" text-reset">
              <FaGoogle />
            </a>
            <a href="/" className=" text-reset">
              <FaFacebookF />
            </a>
            <a href="/" className=" text-reset">
              <FaTwitter />
            </a>
            <a href="/" className=" text-reset">
              <FaInstagram />
            </a>
          </div>
          {/* <!-- Right --> */}
        </section>
        {/* <!-- Section: Social media --> */}

        {/* <!-- Section: Links  --> */}
        <section>
          <div className="mt-5 mb-5 textlinks">
            {/* <!-- Grid row --> */}
            <div className="row textLinks mt-3 d-flex">
              {/* <!-- Grid column --> */}
              <div className="col-md-3 text-left col-lg-4 col-xl-3 mx-auto mb-4">
                {/* <!-- Content --> */}
                <h6 className="text-uppercase  text-white fw-bold mb-4">
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
              <div className="col-md-3 col-lg-2  text-white col-xl-2 mx-auto mb-4">
                {/* <!-- Links --> */}
                <h6 className="text-uppercase fw-bold mb-4">Mapa del sitio</h6>
                <ul className="navbar-nav linkList w-100 ">
                  <li className="nav-item">
                    <NavLink to="/" className="nav-link">
                      <Button className="w-100" variant="outlined">
                        Inicio
                      </Button>
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/sobre-mi" className="nav-link">
                      <Button className="w-100" variant="outlined">
                        Acerca de mi
                      </Button>
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/cursos" className="nav-link">
                      <Button className="w-100" variant="outlined">
                        Cursos
                      </Button>
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/mutanta" className="nav-link">
                      <Button className="w-100" variant="outlined">
                        Mutanta
                      </Button>
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/contacto" className="nav-link">
                      <Button className="w-100" variant="outlined">
                        Contacto
                      </Button>
                    </NavLink>
                  </li>
                </ul>
              </div>
              {/* <!-- Grid column --> */}

              {/* <!-- Grid column --> */}
              <div className="col-md-4 text-center  text-white col-lg-3 col-xl-3 mx-auto mb-md-0 mb-4">
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
        <div className="text-end text-white p-4 border-top ">
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
