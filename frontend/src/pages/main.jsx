import React from "react";

import "./main.css";

function Main({ children }) {
    return (
        <main className="main-conteiner">
            {children}
        </main>
    );
}

export default Main;