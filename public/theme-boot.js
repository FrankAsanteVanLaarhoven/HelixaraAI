/* Early theme apply — loaded as static asset, not via React children */
(function () {
  try {
    var p = localStorage.getItem("helixara.theme") || "system";
    var r =
      p === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : p;
    document.documentElement.dataset.theme = r;
    document.documentElement.dataset.themePref = p;
    document.documentElement.style.colorScheme = r;
  } catch (e) {}
})();
