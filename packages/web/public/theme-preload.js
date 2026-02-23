;(() => {
  var theme = localStorage.getItem("theme") || "system"
  var isDark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)

  document.documentElement.classList.toggle("dark", isDark)

  // Update theme-color meta tag to match resolved theme (controls iOS status/address bar color)
  var meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (!meta) {
    meta = document.createElement("meta")
    meta.setAttribute("name", "theme-color")
    document.head.appendChild(meta)
  }
  meta.setAttribute("content", isDark ? "#23262a" : "#ffffff")
})()
