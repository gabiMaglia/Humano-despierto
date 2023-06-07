import React from "react";
import "./about.css";
import patriciaFoto from "../../assets/img/patricia.jpg";
import { Button } from "@mui/material";

const About = () => {
  return (
    <section className="about-me-cont">
      <header id="header">
        <h1 className="text-white">Conoceme</h1>
      </header>

      <article className="art-cont">
        <div className="introTitle col pb-5 pt-5">
          <h2 className=" text-center pt-3">
            Mi nombre es <strong>Patricia Gonzalez</strong>
          </h2>
          <h3 className=" text-center pt-2 pb-3">
            <em>Soy Humano Despierto </em>
          </h3>
        </div>
        <div className="img-cont col  img-about">
          <img className="img-intro" src={patriciaFoto} alt="Patro" />
        </div>
        <div className="about_text row text-center pb-5 pt-5">
          <p>
            La búsqueda de los por que del universo me hizo conocer y aprender
            diversas disciplinas. Desde mi amor por la naturaleza con el
            Paisajismo y la Comunicación Animal Hasta comprender el
            funcionamiento del cuerpo humano con Medicina China y Terapia Flora
            También Astronomía, Astrología, Constelaciones Familiares,
            Gemoterapia, Tarot, Registros Akáshicos…
          </p>
          <p>
            La Lista es bastante larga. Practico varias de las disciplinas que
            aprendí, que primero sirvieron a mi crecimiento personal y
            espiritual, y hoy atendiendo a otras personas, para el crecimiento
            humano y planetario.
          </p>
          <p>
            aprendiz del Universo Hoy me gusta definirme como
            <br />
            <br />
            <strong>aprendiz del Universo</strong>
          </p>
        </div>

        <fieldset className=" pt-2">
          <legend>Conoce mas a fondo mi trabajo</legend>
          <Button className="w-100" variant="outlined">
            Detalle
          </Button>
        </fieldset>
      </article>
    </section>
  );
};

export default About;
