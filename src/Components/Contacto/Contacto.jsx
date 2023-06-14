import React from "react";
import "./contacto.css";
import contact from "../../assets/contacto.jpg";
import { Button } from "@mui/material";

const Contacto = () => {
  return (
    <>
      <header id="header">
        <h1 className="text-white">Contactame</h1>
      </header>
      <section className="contact_page p-4 px-5 container-fluid section-container d-flex flex-column  ">
        <article className="form-title ">
          <div className="img-cont mb-5">
            <img className="img-intro" src={contact} alt="Contacta con migo" />
          </div>
          <strong>
            <h5>
              Dejame tu mensaje y nos pondremos en contacto en la brevedad
            </h5>
          </strong>
        </article>

        <div className="form-cont">
          <form className="row g-3 mb-4 contact-form">
            <div className="form-cont-1 g-0 d-flex gap-1 p-1">
              <div>
                <div className="mb-3 nombre">
                  <label
                    htmlFor="exampleFormControlInput1"
                    className="form-label"
                  >
                    Nombre
                  </label>
                  <input
                    type="text"
                    className="form-control "
                    id="exampleFormControlInput1"
                    placeholder="Como te llamas?"
                  />
                </div>
                <div className="mb-3 apellido">
                  <label
                    htmlFor="exampleFormControlInput1"
                    className="form-label"
                  >
                    Apellido
                  </label>
                  <input
                    type="text"
                    className="form-control "
                    id="exampleFormControlInput1"
                    placeholder="Como es tu apellido?"
                  />
                </div>
              </div>
              <div>
                <div className="mb-3 ciudad">
                  <label
                    htmlFor="exampleFormControlInput1"
                    className="form-label"
                  >
                    Ciudad
                  </label>
                  <input
                    type="text"
                    className="form-control "
                    id="exampleFormControlInput1"
                    placeholder="Donde vives?"
                  />
                </div>
                <label
                  htmlFor="exampleFormControlInput1"
                  className="form-label"
                >
                  Direccion de email
                </label>
                <input
                  type="email"
                  className="form-control "
                  id="exampleFormControlInput1"
                  placeholder="nombre@xxxxx.com"
                />
              </div>
            </div>
            <div className="mb-3 email"></div>

            <label
              htmlFor="exampleFormControlTextarea1"
              className="form-label w-100"
            >
              Mensaje
            </label>

            <textarea
              className="form-control text"
              id="exampleFormControlTextarea1"
            ></textarea>
            <Button
              className="button_send mt-3 w-100"
              type="submit"
              variant="outlined"
              color="secondary"
            >
              Enviar
            </Button>
          </form>
        </div>
      </section>
    </>
  );
};

export default Contacto;
