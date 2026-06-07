(function () {
  var key = "deka-fit-parejas-v1";

  function safeGet() {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(value) {
    try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  window.DekaStorage = {
    saveLast: function (session) { return safeSet(JSON.stringify(session)); },
    loadLast: function () {
      var raw = safeGet();
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
  };
})();
