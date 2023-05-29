import Home from "./Components/Home/Home";

import Courses from "./Components/Courses/Courses";
import About from "./Components/About/About";
import NavBar from "./Components/NavBar/NavBar";
import Mutanta from "./Components/Mutanta/Mutanta";
import Contacto from "./Components/Contacto/Contacto";
import Footer from "./Components/Footer/Footer";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <div className="App">
      {" "}
      <BrowserRouter>
        <NavBar position="navbar container-fluid navbar-expand-lg  navbar-dark g-0 m-0 p-0 pb-5 " />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sobre-mi" element={<About />} />
          <Route path="/cursos" element={<Courses />} />
          <Route path="/mutanta" element={<Mutanta />} />
          <Route path="/contacto" element={<Contacto />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
