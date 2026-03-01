// contatos.js
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openEmail");
  const modal = document.getElementById("emailModal");
  const closeBtn = document.getElementById("closeEmail");
  const cancelBtn = document.getElementById("cancelEmail");
  const form = document.getElementById("contactForm");
  const hint = document.getElementById("formHint");

  // Se algum id estiver faltando, isso aqui te avisa
  if (!openBtn || !modal || !closeBtn || !cancelBtn || !form) {
    console.error("Algum elemento não foi encontrado. Verifique os IDs no HTML.");
    return;
  }

  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // clicar fora fecha
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // ESC fecha
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // submit (placeholder)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hint.textContent = "Teste OK. Próximo passo: ligar no EmailJS pra enviar de verdade.";
  });
});