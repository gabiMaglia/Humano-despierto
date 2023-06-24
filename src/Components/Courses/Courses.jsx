import React from "react";
import "./courses.css";
import Header from "../Common/Header/Header";
import CursosCard from './CursosCard/CursosCard'
const Courses = () => {
  return (
    <section id="cursosCharlas">
      <Header
        id="cursosHeader"
        title="Cursos"
        style={{ filter: "hue-rotate(43deg)" }}
      />
      
      <div className="cursos-cards-cont">
        
        <CursosCard/>
      </div>
    </section>



    // 
// hacer unas animacion de nodos para los cursos
// al agregarse nuevos cada uno se vuelve mas pequenos
// los de los mismos docentes estan conectados en forma de malla
// 
  );
};

export default Courses;
