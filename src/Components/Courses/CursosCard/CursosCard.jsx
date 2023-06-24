import React from 'react'
import './cursos_card.css'
import astro from '../../../assets/img/IALOGOS/20.jpg'
const CursosCard = () => {
  const curso = {
    img: astro,
    titulo: 'Astrologia 1',
    descripcion: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio molestias, sunt reprehenderit atque ratione, officia',
    duracion: '6 Meses',
    docente: 'Patricia Gonzalez'
  }
  return (
    <article className='cursoCard'>
      <div className="curso-img-cont">
        <img className='curso-img' src={curso.img} alt={curso.titulo} />
      </div>
      <div className="title-cont">
        <h1>{curso.titulo}</h1>
      </div>
      <div className="descripcion-duracion">
        <div className="descripcion">{curso.descripcion}</div>
        <div className="duracion">{curso.duracion}</div>
      </div>
      <div className="docente">{curso.docente}</div>
    </article>
  )
}

export default CursosCard