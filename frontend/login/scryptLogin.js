const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

async function submitForm(solic, password) {
    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitante: solic, password })
    });

    const data = await res.json();

    if (res.ok) {
        msg.style.color = "green";
        msg.textContent = data.message;

    // redireciona para o painel
    setTimeout(() => window.location.href = "/painelGeral.html", 1000);
    } else {
        msg.style.color = "red";
        msg.textContent = data.error;
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const campoSolicitante = document.getElementById("username").value;
    const campoPassword = document.getElementById("password").value;

    await submitForm(campoSolicitante, campoPassword);
});

async function logout() {
    const res = await fetch("/logout", {
        method: "POST"
    });

    const data = await res.json();

    if (res.ok) {
        msg.style.color = "green";
        msg.textContent = data.message;

        // redireciona para o painel
        setTimeout(() => window.location.href = "/painelGeral.html", 1000);
    } else {
        msg.style.color = "red";
        msg.textContent = data.error;
    }
}

// attach the logout function to the logout button
document.getElementById('logoutBtn').addEventListener('click', logout);