// contatos.js

const EMAILJS_PUBLIC_KEY = "WWW5wDL545Iupiq_A";
const EMAILJS_SERVICE_ID = "service_4vpy0th";
const EMAILJS_TEMPLATE_ID = "template_w0qe1m1";

// 2) Elementos do modal
const openEmail = document.getElementById("openEmail");
const closeEmail = document.getElementById("closeEmail");
const cancelEmail = document.getElementById("cancelEmail");
const emailModal = document.getElementById("emailModal");

const contactForm = document.getElementById("contactForm");
const formHint = document.getElementById("formHint");

// 3) Inicia EmailJS
(function initEmailJS() {
  if (!window.emailjs) {
    console.error("EmailJS não carregou. Verifique se o script CDN foi incluído.");
    return;
  }
  emailjs.init(EMAILJS_PUBLIC_KEY);
})();

// 4) Funções modal
function openModal() {
  emailModal.classList.add("is-open");
  emailModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  emailModal.classList.remove("is-open");
  emailModal.setAttribute("aria-hidden", "true");
  formHint.textContent = "";
  contactForm.reset();
}

openEmail.addEventListener("click", openModal);
closeEmail.addEventListener("click", closeModal);
cancelEmail.addEventListener("click", closeModal);
emailModal.addEventListener("click", (e) => {
  if (e.target === emailModal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && emailModal.classList.contains("is-open")) {
    closeModal();
  }
});

// 5) Enviar e-mail
contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Feedback
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  formHint.textContent = "Enviando...";

  try {
    await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, contactForm);
    formHint.textContent = "✅ E-mail enviado com sucesso!";
    submitBtn.disabled = false;

    // Fecha após 1.2s
    setTimeout(() => closeModal(), 1200);
  } catch (err) {
    console.error(err);
    formHint.textContent = "❌ Erro ao enviar. Tente novamente.";
    submitBtn.disabled = false;
  }
});