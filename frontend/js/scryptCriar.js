async function createSolicitant(event) {
    event.preventDefault();
    var formData = new FormData(event.target);

    // try {
    // const response = await fetch("http://localhost:3000/solicitantes/solicitantes", {
    //     method: "POST",
    //     body: formData
    // });

    try {
        const baseUrl = window.location.hostname === "localhost"
            ? "http://localhost:3000"
            : "https://gus-q7nn.onrender.com";
        const response = await fetch(`${baseUrl}/solicitantes/solicitantes`, {
            method: "POST",
            body: formData
    });

    if (response.ok) {
        console.log("Solicitante criado");
        // Redirect or show success message
    } else {
        throw new Error("Erro ao criar solicitante");
    }
    } catch (error) {
        console.error("Ocorreu um erro:", error);
    }
}

document.getElementById("criarForm").addEventListener("submit", createSolicitant);