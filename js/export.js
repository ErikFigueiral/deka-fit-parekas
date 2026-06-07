(function () {
  function escXml(text) {
    return String(text || "").replace(/[<>&'"]/g, function (ch) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[ch];
    });
  }

  function textOf(root, tag) {
    if (!root) return "";
    var el = root.getElementsByTagName(tag)[0];
    return el ? el.textContent || "" : "";
  }

  function toXml(session) {
    var xml = '<?xml version="1.0" encoding="UTF-8"?><dekaFitSession version="3" createdAt="' + escXml(session.createdAt) + '">';
    var i, split;
    xml += "<names><athleteA>" + escXml(session.names.a) + "</athleteA><athleteB>" + escXml(session.names.b) + "</athleteB></names>";
    xml += "<photos><photoA>" + escXml(session.photos.a || "") + "</photoA><photoB>" + escXml(session.photos.b || "") + "</photoB></photos><splits>";
    for (i = 0; i < session.splits.length; i += 1) {
      split = session.splits[i];
      xml += '<split index="' + (i + 1) + '" ms="' + split.ms + '" person="' + escXml(session.assignments[i] || "") + '">';
      xml += "<title>" + escXml(split.title) + "</title><detail>" + escXml(split.detail) + "</detail><standard>" + escXml(split.standard) + "</standard></split>";
    }
    xml += "</splits></dekaFitSession>";
    return xml;
  }

  function fromXml(text, stations) {
    var doc = new DOMParser().parseFromString(text, "application/xml");
    var nodes = doc.getElementsByTagName("split");
    if (!nodes.length) throw new Error("Sin splits");
    var names = doc.getElementsByTagName("names")[0];
    var photos = doc.getElementsByTagName("photos")[0];
    var session = {
      app: "deka-fit-parejas",
      version: 3,
      createdAt: doc.documentElement.getAttribute("createdAt") || new Date().toISOString(),
      names: { a: textOf(names, "athleteA") || "Persona 1", b: textOf(names, "athleteB") || "Persona 2" },
      photos: { a: photos ? textOf(photos, "photoA") : "", b: photos ? textOf(photos, "photoB") : "" },
      assignments: [],
      splits: []
    };
    var i, n;
    for (i = 0; i < nodes.length; i += 1) {
      n = nodes[i];
      session.assignments.push(n.getAttribute("person") || "");
      session.splits.push({
        title: textOf(n, "title") || (stations[i] ? stations[i].title : "Prueba"),
        detail: textOf(n, "detail") || "",
        standard: textOf(n, "standard") || "",
        ms: Number(n.getAttribute("ms")) || 0
      });
    }
    return session;
  }

  function download(name, type, content) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
      return;
    }
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(area);
    done();
  }

  function png(session, total, formatTime, assignmentLabel) {
    var canvas = document.getElementById("exportCanvas");
    var ctx = canvas.getContext("2d");
    var i, y, ms, width;
    ctx.fillStyle = "#061009";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4fff7";
    ctx.font = "900 50px system-ui, sans-serif";
    ctx.fillText("Deka Fit Parejas", 60, 90);
    ctx.font = "800 32px system-ui, sans-serif";
    ctx.fillText(session.names.a + " + " + session.names.b, 60, 138);
    ctx.fillStyle = "#b9ff32";
    ctx.font = "950 88px system-ui, sans-serif";
    ctx.fillText(formatTime(total), 60, 240);
    ctx.font = "800 24px system-ui, sans-serif";
    y = 320;
    for (i = 0; i < session.splits.length; i += 1) {
      ms = Number(session.splits[i].ms) || 0;
      width = total ? Math.max(2, ms / total * 760) : 0;
      ctx.fillStyle = i % 2 ? "#101914" : "#18231d";
      ctx.fillRect(50, y - 28, 980, 52);
      ctx.fillStyle = "#f4fff7";
      ctx.fillText((i + 1 < 10 ? "0" : "") + (i + 1) + "  " + session.splits[i].title, 70, y);
      ctx.textAlign = "right";
      ctx.fillText(formatTime(ms), 1010, y);
      ctx.textAlign = "left";
      ctx.fillStyle = "#26382c";
      ctx.fillRect(190, y + 10, 760, 10);
      ctx.fillStyle = "#b9ff32";
      ctx.fillRect(190, y + 10, width, 10);
      y += 66;
    }
    var a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "deka-fit-captura-" + new Date().toISOString().slice(0, 10) + ".png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  window.DekaExport = { toXml: toXml, fromXml: fromXml, download: download, copyText: copyText, png: png };
})();
