import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProductPage from './pages/ProductPage';
import StructurePage from "./pages/StructurePage.tsx";


const App = () => {
  return (
      <div className='App'>
        <BrowserRouter>
          <Routes>
            <Route path="/product" element={<ProductPage />}></Route>
            <Route path="/struct" element={<StructurePage />}></Route>
          </Routes>
        </BrowserRouter>
      </div>
  );
};

export default App;