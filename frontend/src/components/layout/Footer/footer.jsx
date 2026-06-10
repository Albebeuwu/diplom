import React from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../../context/AuthContext";
import "./footer.css";
import CreateButton from "../../buttons/CreateButton/CreateButton";

function Footer() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth(); 

  return ( 
    <footer>
        <CreateButton onClick={() => navigate('/create-fanfic')} />
        <div className="logo">
          <img src="/logo.png" alt="Логотип" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
        </div>
        <ul className="useful-links">
          <li><a href="#">Политика использования файлов cookie</a></li>
          <li><a href="#">Политика конфиденциальности</a></li>
          <li><a href="#">Условия обслуживания</a></li>
        </ul>
    </footer>
  );
}

export default Footer;