import React from "react";
import "./about.css";
import patriciaFoto from "../../assets/img/patricia.jpg";
import patriciaGrupo1 from "../../assets/img/terapias/8.jpeg";
import patriciaGrupo2 from "../../assets/img/terapias/9.jpeg";
import patriciaGrupo3 from "../../assets/img/terapias/6.jpg";
import patriciaGrupo4 from "../../assets/img/terapias/3.jpg";
import patriciaGrupo5 from "../../assets/img/terapias/2.jpg";
import patriciaGrupo7 from "../../assets/img/terapias/11.jpeg";
import { Button } from "@mui/material";

const About = () => {
  return (
    <section className="about-me-cont  ">
      <header id="header">
        <h1 className="text-white">Conoceme</h1>
      </header>

      <article className="art-cont pt-4">
        <div className="img-cont col">
          <img
            className="img-intro"
            src={patriciaFoto}
            alt="Patricia Gonzales"
          />
        </div>
        <div className="introTitle col pb-5 pt-5">
          <h2 className=" text-center pt-3">
            Mi nombre es <strong>Patricia Gonzalez</strong>
          </h2>
          <h3 className=" text-center pt-2 pb-3">
            <em>Soy Humano Despierto </em>
          </h3>
        </div>
        <div className="about_text row about_text-cont text-center pb-5 pt-5">
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
            <p>
              <strong>aprendiz del Universo</strong>
            </p>
          </p>
        </div>

        {/* carousel */}
        {/* TODO pasar a componenete */}

        <div
          id="carouselAbout"
          className="carousel slide pb-5  "
          data-ride="carousel"
        >
          <ol className="carousel-indicators d-none">
            <li
              data-target="#myCarousel"
              data-slide-to="0"
              className="active"
            ></li>
          </ol>

          <div className="carousel-inner">
            <div className="carousel-item active">
              <img src={patriciaGrupo1} className="d-block w-100" alt="..." />
            </div>
            <div className="carousel-item ">
              <img src={patriciaGrupo3} className="d-block w-100" alt="..." />
            </div>
            <div className="carousel-item ">
              <img src={patriciaGrupo2} className="d-block w-100" alt="..." />
            </div>
            <div className="carousel-item ">
              <img src={patriciaGrupo4} className="d-block w-100" alt="..." />
            </div>
            <div className="carousel-item ">
              <img src={patriciaGrupo5} className="d-block w-100" alt="..." />
            </div>

            <div className="carousel-item ">
              <img src={patriciaGrupo7} className="d-block w-100" alt="..." />
            </div>
          </div>

          <a
            className="carousel-control-prev"
            href="#myCarousel"
            role="button"
            data-slide="prev"
          >
            <span
              className="carousel-control-prev-icon"
              aria-hidden="true"
            ></span>
            <span className="sr-only">Previous</span>
          </a>
          <a
            className="carousel-control-next"
            href="#myCarousel"
            role="button"
            data-slide="next"
          >
            <span
              className="carousel-control-next-icon"
              aria-hidden="true"
            ></span>
            <span className="sr-only">Next</span>
          </a>
        </div>

        {/* carousel end */}

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
