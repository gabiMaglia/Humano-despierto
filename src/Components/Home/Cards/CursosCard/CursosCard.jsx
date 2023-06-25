import React from 'react'
import './cursosCard.css'
import astrologia from "../../../../assets/Terapias/astrologia.png";
import emociones from "../../../../assets/Terapias/healthmind.jpg";

import tarot from "../../../../assets/Terapias/tarot.jpg";

const info = {
  title: 'Charlas, Talleres y Cursos',
  introduction:'Tendrás videos de cada clase, material de lectura obligatoria y material de lectura opcional para bajar.',
} 
const images = [
    {
      url: emociones,
      title: "Neuroalquimia",
      description:
        "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Minus nihil amet sit minima, dignissimos quae odit nulla nobis iste ratione itaque perspiciatis autem qui dicta unde aspernatur quaerat dolore voluptatibus!",
    },
    {
      url: astrologia,
      title: "Astrologia",
      description:
        "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Minus nihil amet sit minima, dignissimos quae odit nulla nobis iste ratione itaque perspiciatis autem qui dicta unde aspernatur quaerat dolore voluptatibus!",
    },
    {
      url: tarot,
      title: "Tarot",
      description:
        "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Minus nihil amet sit minima, dignissimos quae odit nulla nobis iste ratione itaque perspiciatis autem qui dicta unde aspernatur quaerat dolore voluptatibus!",
    },
    
  ];
const CursosCard = () => {
    
  return (
    <article id="charlas-cursos-cont">
    <div className="text-cont charlas ">
      <h2>{info.title}</h2>
      <p className='px-5'>
       {info.introduction}
      </p>
    </div>
    

     
    <div className="cursos-cont">

      {images.map((image) => {
        return (
          
        <div className="cursos_img-cont border">
            <div className="cursos-img">
              <img
                className="img-intro "
                key={image.title}
                src={image.url}
                alt={image.title}
              />
            </div>
            <div className="text-img">
              <p className="cursos_nombre">{image.title}</p>
              <p className="cursos_description">{image.description}</p>
            </div>
          </div>
      
        );
      })}
    </div>
  </article>
  )
}

export default CursosCard