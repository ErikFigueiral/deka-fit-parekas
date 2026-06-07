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
    var i, y, ms, width, max, points, x, py, graphX, graphY, graphW, graphH, label;
    canvas.width = 1080;
    canvas.height = 2100;
    ctx.fillStyle = "#061009";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#152119";
    ctx.fillRect(38, 38, 1004, 2024);
    ctx.fillStyle = "#f4fff7";
    ctx.font = "900 50px system-ui, sans-serif";
    ctx.fillText("Deka Fit Parejas", 60, 90);
    ctx.font = "800 32px system-ui, sans-serif";
    ctx.fillText(session.names.a + " + " + session.names.b, 60, 138);
    ctx.fillStyle = "#b9ff32";
    ctx.font = "950 88px system-ui, sans-serif";
    ctx.fillText(formatTime(total), 60, 240);
    ctx.fillStyle = "#aebcaf";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText("Ritmo y picos por prueba", 60, 302);

    max = 0;
    for (i = 0; i < session.splits.length; i += 1) {
      ms = Number(session.splits[i].ms) || 0;
      if (ms > max) max = ms;
    }
    graphX = 60; graphY = 330; graphW = 960; graphH = 230;
    ctx.fillStyle = "#0b1510";
    ctx.fillRect(graphX, graphY, graphW, graphH);
    ctx.strokeStyle = "rgba(244,255,247,.12)";
    ctx.lineWidth = 1;
    for (i = 1; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(graphX, graphY + i * graphH / 4);
      ctx.lineTo(graphX + graphW, graphY + i * graphH / 4);
      ctx.stroke();
    }
    if (max) {
      points = [];
      for (i = 0; i < session.splits.length; i += 1) {
        ms = Number(session.splits[i].ms) || 0;
        x = graphX + 28 + (graphW - 56) * (i / Math.max(session.splits.length - 1, 1));
        py = graphY + 24 + (graphH - 48) * (1 - ms / max);
        points.push({ x: x, y: py });
      }
      ctx.beginPath();
      ctx.moveTo(points[0].x, graphY + graphH - 22);
      for (i = 0; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.lineTo(points[points.length - 1].x, graphY + graphH - 22);
      ctx.closePath();
      ctx.fillStyle = "rgba(185,255,50,.16)";
      ctx.fill();
      ctx.beginPath();
      for (i = 0; i < points.length; i += 1) {
        if (i) ctx.lineTo(points[i].x, points[i].y);
        else ctx.moveTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = "#b9ff32";
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      for (i = 0; i < points.length; i += 1) {
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#00e676";
        ctx.fill();
        label = rhythmLabel(session.splits[i].title);
        if (label) {
          ctx.fillStyle = "#ffb020";
          ctx.beginPath();
          ctx.arc(points[i].x, points[i].y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#061009";
          ctx.font = "950 12px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText((i + 1 < 10 ? "0" : "") + (i + 1), points[i].x, points[i].y + 4);
          ctx.textAlign = "left";
        }
      }
    }

    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillStyle = "#aebcaf";
    ctx.fillText("Peso de cada prueba en el total", 60, 628);
    y = 690;
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

  function rhythmLabel(title) {
    title = String(title || "").toLowerCase();
    if (title.indexOf("160 m") >= 0) return "";
    if (title.indexOf("zancada") >= 0) return "SAC";
    if (title.indexOf("remo") >= 0) return "REM";
    if (title.indexOf("cajon") >= 0 || title.indexOf("cajón") >= 0) return "BOX";
    if (title.indexOf("abs") >= 0) return "ABS";
    if (title.indexOf("ski") >= 0) return "SKI";
    if (title.indexOf("granjero") >= 0) return "GRI";
    if (title.indexOf("bike") >= 0) return "BIK";
    if (title.indexOf("balon") >= 0 || title.indexOf("balón") >= 0) return "BAL";
    if (title.indexOf("empuje") >= 0) return "PUS";
    if (title.indexOf("burpee") >= 0) return "BUR";
    return "";
  }

  window.DekaExport = { toXml: toXml, fromXml: fromXml, download: download, copyText: copyText, png: png };
})();
