;(() => {
  var theme = localStorage.getItem("theme") || "system"
  var isDark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)

  document.documentElement.classList.toggle("dark", isDark)
})()
