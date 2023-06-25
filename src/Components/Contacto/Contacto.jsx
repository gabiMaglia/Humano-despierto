import React from "react";
import "./contacto.css";
import contact from "../../assets/contacto.jpg";
import { Button } from "@mui/material";
import Header from "../Common/Header/Header";

const Contacto = () => {

  return (
    <>
    <Header
      id="cursosHeader"
      title="Contacto"
      style={{ filter: "hue-rotate(0deg)" }}
    />
      <section className="contact_page p-5 px-5 container-fluid section-container d-flex flex-row justify-content-center">
        <article className="form-title">
          <div className="contacto-img-cont mb-4">
            <img className="contacto-img-intro" src={contact} alt="Contacta con migo" />
          </div>
          <strong>
            <h5 className="contacto-dejame-tu-mensaje">
              Dejame tu consulta y tratare de responderte con brevedad.
            </h5>
          </strong>
        </article>

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
              className="button_send mt-5 w-100"
              type="submit"
              variant="outlined"
              
            >
              Enviar
            </Button>
          </form>
      
      </section>
    </>
  );
};

export default Contacto;
