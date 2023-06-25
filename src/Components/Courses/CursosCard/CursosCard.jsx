import React from "react";
import "./cursos_card.css";
import astro from "../../../assets/img/IALOGOS/20.jpg";
const CursosCard = () => {
  const curso = [
    {
      img: astro,
      titulo: "Astrologia 1",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
    {
      img: astro,
      titulo: "Astrologia 2",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
    {
      img: astro,
      titulo: "Astrologia 3",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
    {
      img: astro,
      titulo: "Tarot 1",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
    {
      img: astro,
      titulo: "Tarot 2",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
    {
      img: astro,
      titulo: "Tarot 3",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
    {
      img: astro,
      titulo: "Neuro 1",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
    {
      img: astro,
      titulo: "Neuro 2",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
    {
      img: astro,
      titulo: "Neuro 3",
      descripcion:
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia",
      duracion: "6 Meses",
      docente: "Patricia Gonzalez",
    },
  ];

  return (
    <>
      <div className="cursos-cont-title">
        <div className="cursos-cont-title-text">
          <h2>Bienvenido a nuestra seccion de cursos</h2>{" "}
          <p className="mt-4 mb-5">
            Aqui podras elegir en que area deseas especializarte, tendras toda
            la asistencia necesaria para atravezar el gran camino del
            aprendizaje!{" "}
          </p>
        </div>
        <div className="cursos-cont-selector">
          <label htmlFor="sort">Ordenar por</label>
          <select id="cars" name="carlist" form="carform">
            <option value="opel">A-Z</option>
            <option value="volvo">Docente</option>
            <option value="saab">Duracion</option>
          </select>
        </div>
      </div>

      <div className="cursoCardCont">
        {curso.map((e, i) => {
          return (
            <article className="cursoCard" key={i}>
              <div className="curso-img-cont">
                <img className="curso-img" src={e.img} alt={e.titulo} />
              </div>
              <div className="curso-title-cont mt-1">
                <h1>{e.titulo}</h1>
              </div>
              <div className="curso-descripcion mt-1">
                {e.descripcion}
                </div>
              <div className="curso-duracion-docente mt-3">
                <div className="curso-duracion">
                  <strong>Duracion</strong><br /> {e.duracion}
                </div>
                <div className="curso-docente">
                  <strong>Docente </strong><br />
                  {e.docente}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
};

export default CursosCard;
