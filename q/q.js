/* ORIGIN questionnaire engine. One folder per form: index.html + form.json. Answers save to our Supabase table `answers`
   (insert-only for the public key) and to the phone's own storage. Nicholas reads them with origin/os/q/read_answers.py. */
(function () {
  var slug = location.pathname.replace(/\/+$/, "").split("/").pop();
  var CFG = window.Q_CONFIG || {};
  var F, Q, KEY = "origin-q-" + slug, answers = {}, whoEl = document.getElementById("pr-who"), root = document.getElementById("pr"), storageBroken = false, device = "", revStore = {}, touched = {};
  try { revStore = JSON.parse(localStorage.getItem(KEY + "-rev") || "{}"); touched = JSON.parse(localStorage.getItem(KEY + "-touched") || "{}"); } catch (e) {}
  try { answers = JSON.parse(localStorage.getItem(KEY) || "{}"); whoEl.value = localStorage.getItem("origin-q-who") || ""; device = localStorage.getItem("origin-q-device") || ""; if (!device) { device = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6); localStorage.setItem("origin-q-device", device); } } catch (e) { storageBroken = true; device = "nostore-" + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function key(id, sub) { return id + (sub !== undefined ? "-" + sub : ""); }
  function val(k) { return (answers[k] || "").trim(); }
  function shown(q) { if (!q.showIf) return true; return val(key(q.showIf.id)) === q.showIf.equals; }
  function isAnswered(q) {
    if (q.type === "table") return q.rows.every(function (_, i) { return val(key(q.id, i)); });
    if (q.type === "multi") return q.rows.some(function (_, i) { return val(key(q.id, i)); });
    return !!val(key(q.id)) || !!val(key(q.id, "note"));
  }
  function render() {
    document.getElementById("lede").textContent = F.lede;
    var toc = "", h = "";
    Q.forEach(function (sec) {
      if (Q.length > 1) toc += '<a href="#sec-' + sec.id + '">' + esc(sec.title) + '</a>';
      h += '<section class="sec" id="sec-' + sec.id + '"><h2>' + esc(sec.title) + '</h2><p class="lead">' + esc(sec.lead || "") + '</p><div class="count" id="count-' + sec.id + '"></div>';
      sec.qs.forEach(function (q, n) {
        h += '<div class="q' + (shown(q) ? '' : ' hidden-q') + '" data-q="' + q.id + '"><h3><span class="num">' + (n + 1) + '</span>' + esc(q.t) + '</h3>';
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
      h += '<div class="saved" id="saved-' + sec.id + '"></div><div class="send"><button type="button" data-push="' + sec.id + '">Send now</button><button type="button" class="alt" data-send="' + sec.id + '">Text it instead</button><span class="hint">Sends by itself a few seconds after you stop typing, and keeps a copy on this phone. "Text it instead" opens a text message: pick Nicholas as the person to send it to.</span></div></section>';
    });
    document.getElementById("pr-toc").innerHTML = toc; document.getElementById("pr-secs").innerHTML = h; counts();
  }
  function counts() {
    Q.forEach(function (sec) { var live = sec.qs.filter(shown); var done = live.filter(isAnswered).length, all = live.length; var el = document.getElementById("count-" + sec.id); el.textContent = done + " of " + all + " answered"; el.className = "count" + (done === all ? " done" : ""); });
    // conditional questions appear or disappear as their trigger answer changes
    Q.forEach(function (sec) { sec.qs.forEach(function (q) { if (!q.showIf) return; var el = document.querySelector('.q[data-q="' + q.id + '"]'); if (el) el.classList.toggle("hidden-q", !shown(q)); }); });
  }
  function save(k, v) { answers[k] = v; try { localStorage.setItem(KEY, JSON.stringify(answers)); } catch (e) { storageBroken = true; } counts(); }
  function compile(secId) {
    var sec = Q.filter(function (s) { return s.id === secId; })[0];
    var out = [F.title.toUpperCase() + (Q.length > 1 ? " — " + sec.title : ""), "From: " + (whoEl.value || F.who) + " · " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), ""], n = 0;
    sec.qs.forEach(function (q, i) {
      if (!shown(q) || !isAnswered(q)) return; n++;
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
      if (!shown(q)) return;
      if (q.type === "multi" || q.type === "table") q.rows.forEach(function (r, j) { var v = val(key(q.id, j)); if (v) o[q.id + "." + j] = { q: q.t, row: (q.type === "table" ? r[0] : r), a: v }; });
      else { var v = val(key(q.id)), nt = val(key(q.id, "note")); if (v || nt) o[q.id] = { q: q.t, a: v, note: nt }; }
    });
    return o;
  }
  // ---- save to the store ----
  // One request in flight per section; every edit bumps that section's revision; "Saved" is shown only when the
  // response belongs to the revision that is still current. An emptied section is sent as an explicit "(cleared)".
  var timers = {}, lastSent = {}, rev = {}, inflight = {};
  function status(id, cls, msg) { var el = document.getElementById("saved-" + id); if (el) { el.className = "saved" + (cls ? " " + cls : ""); el.textContent = msg + (storageBroken ? " · This phone cannot keep a copy, so stay on this page until it says Saved." : ""); } }
  function everSent(id) { if (lastSent[id] || touched[id]) return true; try { return !!localStorage.getItem(KEY + "-sent-" + id); } catch (e) { return false; } }
  function bumpRev(id) { rev[id] = (rev[id] || 0) + 1; revStore[id] = (revStore[id] || 0) + 1; touched[id] = true; try { localStorage.setItem(KEY + "-rev", JSON.stringify(revStore)); localStorage.setItem(KEY + "-touched", JSON.stringify(touched)); } catch (e) {} }
  function subId(id) { return device + "-" + id + "-" + (revStore[id] || 0); }   // one id per section revision: a retry of the same revision carries the same id, so the reader can drop duplicates
  function push(id, force, urgent) {
    // "(cleared)" is sent whenever a section that was ever saved is now empty, including a clear made during a save or before a reopen.
    var text = compile(id) || (everSent(id) ? "(cleared)" : "");
    if (!text) return;
    if (!force && lastSent[id] === text) return;
    if (!CFG.gform && !(CFG.url && CFG.key)) { status(id, "bad", "Sending is not switched on yet. Use Text it instead."); return; }
    if (inflight[id] && !urgent) { inflight[id] = "again"; return; }
    var myRev = rev[id] || 0; if (!urgent) inflight[id] = true;
    status(id, "busy", "Sending…");
    var row = { form: slug, section: id, who: (whoEl.value || F.who), device: device, rev: (revStore[id] || 0), sub: subId(id), at: new Date().toISOString(), answers: sectionAnswers(id), text: text };
    var sends = [];
    if (CFG.gform) {
      // Google Forms answers with an opaque response (no-cors): a network error is the only failure we can see, and that is what we handle
      var fd = new FormData(); fd.append(CFG.gentry, JSON.stringify(row));
      sends.push(fetch(CFG.gform, { method: "POST", mode: "no-cors", keepalive: true, body: fd }));
    }
    if (CFG.url && CFG.key) {
      sends.push(fetch(CFG.url + "/rest/v1/answers", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", "apikey": CFG.key, "Authorization": "Bearer " + CFG.key, "Prefer": "return=minimal" }, body: JSON.stringify({ form: slug, section: id, who: row.who, device: device, rev: myRev, answers: row.answers, text: text }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); }));
    }
    Promise.all(sends)
      .then(function () {
        // the bucket now holds THIS text; record it before deciding whether a newer revision must follow
        try { localStorage.setItem(KEY + "-sent-" + id, text); } catch (e) {}
        var stale = (rev[id] || 0) !== myRev;
        if (!stale) lastSent[id] = text;
        if (urgent) return;
        var again = inflight[id] === "again"; inflight[id] = false;
        if (stale || again) { lastSent[id] = text; push(id, true); return; }
        status(id, "", "Sent to Nicholas ✓ " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " · a copy stays on this phone");
      })
      .catch(function () { if (!urgent) inflight[id] = false; status(id, "bad", "Not sent yet (no signal?). Your answers are kept on this phone; it will try again, or tap Send now."); setTimeout(function () { push(id); }, 30000); });
  }
  function schedule(id) { bumpRev(id); clearTimeout(timers[id]); status(id, "busy", "Typing… sends in a moment"); timers[id] = setTimeout(function () { push(id); }, 6000); }
  function sectionOf(el) { var s = el.closest("section.sec"); return s ? s.id.replace("sec-", "") : null; }
  root.addEventListener("input", function (e) { var el = e.target; if (el.dataset && el.dataset.k) save(el.dataset.k, el.value); if (el === whoEl) { try { localStorage.setItem("origin-q-who", whoEl.value); } catch (x) {} Q.forEach(function (sec) { if (compile(sec.id)) schedule(sec.id); }); return; } var id = sectionOf(el); if (id) schedule(id); });
  root.addEventListener("change", function (e) { var el = e.target; if (el.type !== "radio") return; save(el.name, el.value); document.querySelectorAll('input[name="' + el.name + '"]').forEach(function (r) { r.closest(".choice").classList.toggle("picked", r.checked); }); var id = sectionOf(el); if (id) schedule(id); });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.push) { clearTimeout(timers[b.dataset.push]); push(b.dataset.push, true); }
    if (b.dataset.send) { var t = compile(b.dataset.send); if (!t) { alert("Nothing answered in this section yet."); return; } location.href = "sms:" + (CFG.sms || "") + "&body=" + encodeURIComponent(t); }
  });
  // leaving the page: fire a keepalive save of every section with unsaved edits, even if an earlier save is still in flight
  window.addEventListener("pagehide", function () { Q.forEach(function (sec) { var id = sec.id; clearTimeout(timers[id]); var t = compile(id) || (everSent(id) ? "(cleared)" : ""); if (t && lastSent[id] !== t) push(id, true, true); }); });
  fetch("form.json").then(function (r) { return r.json(); }).then(function (f) {
    F = f; Q = f.sections; render();
    // on open: anything typed but not yet saved goes up; a section saved before and emptied since goes up as "(cleared)"
    Q.forEach(function (sec) { var t = compile(sec.id); var sent = null; try { sent = localStorage.getItem(KEY + "-sent-" + sec.id); } catch (e) {} if (!t && !sent) return; if (sent === t || (!t && sent === "(cleared)")) { lastSent[sec.id] = sent; status(sec.id, "", "Sent to Nicholas ✓ · a copy stays on this phone"); } else { lastSent[sec.id] = sent || ""; push(sec.id, true); } });
  });
})();
