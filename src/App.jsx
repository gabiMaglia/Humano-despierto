import Home from "./Components/Home/Home";

import Courses from "./Components/Courses/Courses";
import About from "./Components/About/About";
import NavBar from "./Components/NavBar/NavBar";
import Mutanta from "./Components/Mutanta/Mutanta";
import Contacto from "./Components/Contacto/Contacto";
import Footer from "./Components/Footer/Footer";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Charlas from "./Components/Charlas/Charlas";
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <NavBar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sobre-mi" element={<About />} />
            <Route path="/charlas" element={<Charlas />} />
            <Route path="/cursos" element={<Courses />} />
            <Route path="/mutanta" element={<Mutanta />} />
            <Route path="/contacto" element={<Contacto />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
