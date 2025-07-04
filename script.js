function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function showPopup(title, description) {
  alert(`${title}\n\n${description}`);
}

window.onload = () => {
  gsap.from(".banner-content", { opacity: 0, y: 40, duration: 1 });
  gsap.from(".section", { opacity: 0, y: 30, duration: 0.8, stagger: 0.3, delay: 0.5 });
  gsap.from(".tile", { opacity: 0, scale: 0.9, stagger: 0.05, duration: 0.5, delay: 0.8 });
};

function handleSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const status = document.getElementById("form-status");

  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  // Simulated message sending
  status.textContent = "Sending...";
  setTimeout(() => {
    status.textContent = `Thanks, ${name}! Your message has been sent.`;
    form.reset();
  }, 1500);

  return false; // prevent actual form submission
}
