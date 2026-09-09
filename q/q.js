/* ORIGIN questionnaire engine. One folder per form: index.html + form.json. Answers save to our Supabase table `answers`
   (insert-only for the public key) and to the phone's own storage. Nicholas reads them with origin/os/q/read_answers.py. */
(function () {
  var slug = location.pathname.replace(/\/+$/, "").split("/").pop();
  var CFG = window.Q_CONFIG || {};
  var F, Q, KEY = "origin-q-" + slug, answers = {}, whoEl = document.getElementById("pr-who"), root = document.getElementById("pr");
  try { answers = JSON.parse(localStorage.getItem(KEY) || "{}"); whoEl.value = localStorage.getItem("origin-q-who") || ""; } catch (e) {}
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function key(id, sub) { return id + (sub !== undefined ? "-" + sub : ""); }
  function val(k) { return (answers[k] || "").trim(); }
  function isAnswered(q) {
    if (q.type === "multi" || q.type === "table") return q.rows.some(function (_, i) { return val(key(q.id, i)); });
    return !!val(key(q.id)) || !!val(key(q.id, "note"));
  }
  function render() {
    document.getElementById("lede").textContent = F.lede;
    var toc = "", h = "";
    Q.forEach(function (sec) {
      if (Q.length > 1) toc += '<a href="#sec-' + sec.id + '">' + esc(sec.title) + '</a>';
      h += '<section class="sec" id="sec-' + sec.id + '"><h2>' + esc(sec.title) + '</h2><p class="lead">' + esc(sec.lead || "") + '</p><div class="count" id="count-' + sec.id + '"></div>';
      sec.qs.forEach(function (q, n) {
        h += '<div class="q"><h3><span class="num">' + (n + 1) + '</span>' + esc(q.t) + '</h3>';
        if (q.w) h += '<p class="why">' + esc(q.w) + '</p>';
        var k = key(q.id);
        if (q.type === "choice") {
          h += '<div class="field"><div class="choices">' + q.opts.map(function (o) { var on = val(k) === o; return '<label class="choice' + (on ? ' picked' : '') + '"><input type="radio" name="' + k + '" value="' + esc(o) + '"' + (on ? ' checked' : '') + '><span>' + esc(o) + '</span></label>'; }).join("") + '</div>';
          h += '<textarea data-k="' + key(q.id, "note") + '" placeholder="' + esc(q.note || "Anything to add (optional)") + '">' + esc(val(key(q.id, "note"))) + '</textarea></div>';
        } else if (q.type === "multi") {
          h += '<div class="field">' + q.rows.map(function (r, i) { return '<p class="row">' + esc(r) + '</p><textarea data-k="' + key(q.id, i) + '">' + esc(val(key(q.id, i))) + '</textarea>'; }).join("") + '</div>';
        } else if (q.type === "table") {
          h += '<div class="tablewrap"><table><thead><tr>' + q.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join("") + '</tr></thead><tbody>' +
            q.rows.map(function (r, i) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join("") + '<td><input type="text" data-k="' + key(q.id, i) + '" value="' + esc(val(key(q.id, i))) + '"></td></tr>'; }).join("") + '</tbody></table></div>';
        } else {
          h += '<div class="field"><textarea data-k="' + k + '" placeholder="' + esc(q.ph || "") + '">' + esc(val(k)) + '</textarea></div>';
        }
        h += '</div>';
      });
      h += '<div class="saved" id="saved-' + sec.id + '"></div><div class="send"><button type="button" data-push="' + sec.id + '">Save now</button><button type="button" class="alt" data-send="' + sec.id + '">Text it instead</button><span class="hint">Saves by itself a few seconds after you stop typing. "Save now" if you want to be sure.</span></div></section>';
    });
    document.getElementById("pr-toc").innerHTML = toc; document.getElementById("pr-secs").innerHTML = h; counts();
  }
  function counts() {
    Q.forEach(function (sec) { var done = sec.qs.filter(isAnswered).length, all = sec.qs.length; var el = document.getElementById("count-" + sec.id); el.textContent = done + " of " + all + " answered"; el.className = "count" + (done === all ? " done" : ""); });
  }
  function save(k, v) { answers[k] = v; try { localStorage.setItem(KEY, JSON.stringify(answers)); } catch (e) {} counts(); }
  function compile(secId) {
    var sec = Q.filter(function (s) { return s.id === secId; })[0];
    var out = [F.title.toUpperCase() + (Q.length > 1 ? " — " + sec.title : ""), "From: " + (whoEl.value || F.who) + " · " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), ""], n = 0;
    sec.qs.forEach(function (q, i) {
      if (!isAnswered(q)) return; n++;
      out.push((i + 1) + ". " + q.t);
      if (q.type === "choice") { if (val(key(q.id))) out.push("   → " + val(key(q.id))); if (val(key(q.id, "note"))) out.push("   note: " + val(key(q.id, "note"))); }
      else if (q.type === "multi") q.rows.forEach(function (r, j) { if (val(key(q.id, j))) out.push("   • " + r + " → " + val(key(q.id, j))); });
      else if (q.type === "table") q.rows.forEach(function (r, j) { if (val(key(q.id, j))) out.push("   • " + r[0] + " → " + val(key(q.id, j))); });
      else out.push("   → " + val(key(q.id)));
      out.push("");
    });
    if (!n) return "";
    out.push("(" + n + " of " + sec.qs.length + " answered)");
    return out.join("\n");
  }
  function sectionAnswers(secId) {
    var sec = Q.filter(function (s) { return s.id === secId; })[0], o = {};
    sec.qs.forEach(function (q) {
      if (q.type === "multi" || q.type === "table") q.rows.forEach(function (r, j) { var v = val(key(q.id, j)); if (v) o[q.id + "." + j] = { q: q.t, row: (q.type === "table" ? r[0] : r), a: v }; });
      else { var v = val(key(q.id)), nt = val(key(q.id, "note")); if (v || nt) o[q.id] = { q: q.t, a: v, note: nt }; }
    });
    return o;
  }
  // ---- save to the store ----
  var timers = {}, lastSent = {};
  function status(id, cls, msg) { var el = document.getElementById("saved-" + id); if (el) { el.className = "saved" + (cls ? " " + cls : ""); el.textContent = msg; } }
  function push(id, force) {
    var text = compile(id); if (!text) return;
    if (!force && lastSent[id] === text) return;
    if (!CFG.url || !CFG.key) { status(id, "bad", "Saving is not switched on yet. Use Text it instead."); return; }
    status(id, "busy", "Saving…");
    fetch(CFG.url + "/rest/v1/answers", { method: "POST", headers: { "Content-Type": "application/json", "apikey": CFG.key, "Authorization": "Bearer " + CFG.key, "Prefer": "return=minimal" },
      body: JSON.stringify({ form: slug, section: id, who: (whoEl.value || F.who), answers: sectionAnswers(id), text: text }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); lastSent[id] = text; try { localStorage.setItem(KEY + "-sent-" + id, text); } catch (e) {} status(id, "", "Saved to Nicholas ✓ " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })); })
      .catch(function () { status(id, "bad", "Not saved yet (no signal?). It will retry, or tap Save now."); setTimeout(function () { push(id); }, 30000); });
  }
  function schedule(id) { clearTimeout(timers[id]); status(id, "busy", "Typing… saves in a moment"); timers[id] = setTimeout(function () { push(id); }, 6000); }
  function sectionOf(el) { var s = el.closest("section.sec"); return s ? s.id.replace("sec-", "") : null; }
  root.addEventListener("input", function (e) { var el = e.target; if (el.dataset && el.dataset.k) save(el.dataset.k, el.value); if (el === whoEl) { try { localStorage.setItem("origin-q-who", whoEl.value); } catch (x) {} } var id = sectionOf(el); if (id) schedule(id); });
  root.addEventListener("change", function (e) { var el = e.target; if (el.type !== "radio") return; save(el.name, el.value); document.querySelectorAll('input[name="' + el.name + '"]').forEach(function (r) { r.closest(".choice").classList.toggle("picked", r.checked); }); var id = sectionOf(el); if (id) schedule(id); });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.push) { clearTimeout(timers[b.dataset.push]); push(b.dataset.push, true); }
    if (b.dataset.send) { var t = compile(b.dataset.send); if (!t) { alert("Nothing answered in this section yet."); return; } location.href = "sms:" + (CFG.sms || "") + "&body=" + encodeURIComponent(t); }
  });
  window.addEventListener("pagehide", function () { Object.keys(timers).forEach(function (id) { clearTimeout(timers[id]); push(id); }); });
  fetch("form.json").then(function (r) { return r.json(); }).then(function (f) {
    F = f; Q = f.sections; render();
    Q.forEach(function (sec) { var t = compile(sec.id); if (!t) return; var sent = null; try { sent = localStorage.getItem(KEY + "-sent-" + sec.id); } catch (e) {} if (sent === t) { lastSent[sec.id] = t; status(sec.id, "", "Saved to Nicholas ✓"); } else push(sec.id, true); });
  });
})();
