import { useLocation } from 'react-router-dom';
import './searchBar.css'
function SearchBar() {
  const location = useLocation();
  const showSearchBar = location.pathname === '/cursos';

  if (!showSearchBar) {
    return null; // Si no se muestra la barra de búsqueda, el componente retorna null para no renderizar nada
  }

  return (
    <form action="/buscar" method="get">
      <input className='cursos_search-bar'  type="text" name="q" placeholder="Buscar..." />
      <button className='search-button' type="reset" value="Buscar" />
    </form>
  );
}

export default SearchBar;