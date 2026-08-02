(function () {
  "use strict";

  var TEAM_ORDER = ["市委", "市政府", "市人大常委会", "市政协"];
  var TEAM_CLASS = { "市委": "t1", "市政府": "t2", "市人大常委会": "t3", "市政协": "t4" };
  var STORAGE_KEY = "yc-talent-hub-people-v1";

  var defaultData = window.TALENT_DATA || { meta: {}, people: [] };
  var state = {
    people: loadSaved() || defaultData.people.map(clonePerson),
    team: "全部",
    type: "全部",
    search: "",
    sort: "default"
  };

  var els = {
    metaLine: document.getElementById("metaLine"),
    stats: document.getElementById("stats"),
    cards: document.getElementById("cards"),
    emptyState: document.getElementById("emptyState"),
    search: document.getElementById("searchInput"),
    teamFilter: document.getElementById("teamFilter"),
    typeFilter: document.getElementById("typeFilter"),
    sortSelect: document.getElementById("sortSelect"),
    importBtn: document.getElementById("importBtn"),
    exportBtn: document.getElementById("exportBtn"),
    resetBtn: document.getElementById("resetBtn"),
    csvInput: document.getElementById("csvInput"),
    detail: document.getElementById("detail"),
    detailBody: document.getElementById("detailBody"),
    closeDetail: document.getElementById("closeDetail")
  };

  function clonePerson(p) {
    return JSON.parse(JSON.stringify(p));
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.people));
    } catch (e) {
      // storage may be unavailable when opened from file; keep running
    }
  }

  function icon(name) {
    var paths = {
      user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
      mapPin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 4.5v15Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
      route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h6"/>',
      award: '<circle cx="12" cy="9" r="5"/><path d="M9 14 8 22l4-3 4 3-1-8"/>',
      link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
      sparkle: '<path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.3L12 3Z"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || "") + "</svg>";
  }

  function teamClass(p) {
    for (var i = 0; i < TEAM_ORDER.length; i++) {
      if (p.teams.indexOf(TEAM_ORDER[i]) !== -1) return TEAM_CLASS[TEAM_ORDER[i]];
    }
    return "t1";
  }

  function classifyType(p) {
    var roles = p.currentRoles || "";
    var withoutDeputy = roles
      .replace(/副市长/g, "")
      .replace(/副书记/g, "")
      .replace(/副主任/g, "")
      .replace(/副主席/g, "");
    if (/(市委书记|市长|市人大常委会.*主任|市政协.*主席)/.test(withoutDeputy)) return "正职";
    if (/(副书记|副市长|副主任|副主席)/.test(roles)) return "副职";
    return "其他";
  }

  function searchText(p) {
    var careerText = (p.career || [])
      .map(function (c) { return [c.period, c.role, c.note].join(" "); })
      .join(" ");
    var honorText = (p.honors || [])
      .map(function (h) { return [h.date, h.title, h.note].join(" "); })
      .join(" ");
    return [
      p.name,
      (p.teams || []).join(" "),
      p.currentRoles,
      p.gender,
      p.ethnicity,
      p.birthDate,
      p.nativePlace,
      p.partyJoin,
      p.workStart,
      p.education,
      p.degree,
      careerText,
      honorText,
      p.promotion,
      p.note
    ].join(" ").toLowerCase();
  }

  function filteredPeople() {
    var query = state.search.trim().toLowerCase();
    return state.people
      .filter(function (p) {
        if (state.team !== "全部" && (p.teams || []).indexOf(state.team) === -1) return false;
        if (state.type !== "全部" && classifyType(p) !== state.type) return false;
        if (query && searchText(p).indexOf(query) === -1) return false;
        return true;
      })
      .sort(sortPeople);
  }

  function sortPeople(a, b) {
    if (state.sort === "name") return a.name.localeCompare(b.name, "zh-Hans-CN");
    if (state.sort === "birth") {
      var an = birthKey(a), bn = birthKey(b);
      return an === bn ? 0 : (an || 999999) - (bn || 999999);
    }
    if (state.sort === "career") {
      var ac = (a.career || []).length, bc = (b.career || []).length;
      if (ac !== bc) return bc - ac;
    }
    var ai = a.id ? String(a.id) : "", bi = b.id ? String(b.id) : "";
    return ai.localeCompare(bi, "zh-Hans-CN");
  }

  function birthKey(p) {
    var m = /^(\d{4})-?(\d{2})?/.exec(p.birthDate || "");
    return m ? Number(m[1] + (m[2] || "00")) : 0;
  }

  function renderMeta() {
    els.metaLine.textContent =
      "数据截至 " + (defaultData.meta.updatedAt || "") +
      " · 共 " + state.people.length + " 人 · 来源：政府门户、百度百科等公开渠道";
  }

  function renderStats() {
    var counts = { "全部": state.people.length };
    TEAM_ORDER.forEach(function (team) {
      counts[team] = state.people.filter(function (p) { return p.teams.indexOf(team) !== -1; }).length;
    });
    var html =
      statCard(counts["全部"], "人员总数", "") +
      statCard(counts["市委"], "市委班子", "accent-1") +
      statCard(counts["市政府"], "市政府班子", "accent-2") +
      statCard(counts["市人大常委会"], "市人大常委会", "accent-3") +
      statCard(counts["市政协"], "市政协班子", "accent-4");
    els.stats.innerHTML = html;
  }

  function statCard(value, label, accent) {
    return '<div class="stat ' + accent + '"><div class="stat-label">' + label + "</div>" +
      '<div class="stat-value">' + value + "</div></div>";
  }

  function teamChips(p) {
    return (p.teams || [])
      .map(function (t) { return '<span class="team-chip ' + TEAM_CLASS[t] + '">' + t + "</span>"; })
      .join("");
  }

  function cardFacts(p) {
    var facts = [];
    if (p.birthDate) facts.push('<span>' + icon("calendar") + p.birthDate + "</span>");
    if (p.nativePlace) facts.push('<span>' + icon("mapPin") + escapeHtml(p.nativePlace) + "</span>");
    if (p.education) facts.push('<span>' + icon("book") + escapeHtml(p.education) + "</span>");
    if (!facts.length) facts.push('<span>' + icon("sparkle") + "基础资料待补充</span>");
    return facts.join("");
  }

  function renderCards() {
    var people = filteredPeople();
    els.emptyState.hidden = people.length !== 0;
    els.cards.innerHTML = people.map(function (p) {
      var roles = p.currentRoles ? p.currentRoles.replace(/；/g, "；") : "职务待补充";
      var careerCount = (p.career || []).length;
      var honorCount = (p.honors || []).length;
      return (
        '<article class="card" data-id="' + escapeAttr(p.id) + '" role="button" tabindex="0">' +
          '<div class="card-head">' +
            '<div class="avatar ' + teamClass(p) + '">' + escapeHtml((p.name || "?").charAt(0)) + "</div>" +
            '<div class="card-title">' +
              "<h3>" + escapeHtml(p.name) + "</h3>" +
              '<div class="teams">' + teamChips(p) + "</div>" +
            "</div>" +
          "</div>" +
          '<div class="card-roles">' + escapeHtml(roles) + "</div>" +
          '<div class="card-facts">' + cardFacts(p) + "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderAll() {
    renderMeta();
    renderStats();
    renderCards();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function careerSortKey(item) {
    var period = item.period || "";
    if (period.indexOf("曾任") === 0) return -1;
    if (period.indexOf("现任") === 0) return 999999;
    var m = /(\d{4})/.exec(period);
    return m ? Number(m[1]) : 0;
  }

  function openDetail(p) {
    var infoRows = [
      ["性别", p.gender],
      ["民族", p.ethnicity],
      ["出生年月", p.birthDate],
      ["籍贯", p.nativePlace],
      ["入党时间", p.partyJoin],
      ["参加工作", p.workStart],
      ["学历", p.education],
      ["专业/学位", p.degree]
    ].filter(function (row) { return row[1]; });

    var career = (p.career || []).slice().sort(function (a, b) {
      return careerSortKey(a) - careerSortKey(b);
    });

    var careerHtml = career.length
      ? '<ol class="timeline">' + career.map(function (item) {
          var current = /现任|至今/.test(item.period || "");
          return (
            '<li class="timeline-item' + (current ? " current" : "") + '">' +
              '<div class="timeline-period">' + escapeHtml(item.period || "") + "</div>" +
              '<div class="timeline-role">' + escapeHtml(item.role || "") + "</div>" +
              (item.note ? '<div class="timeline-note">' + escapeHtml(item.note) + "</div>" : "") +
            "</li>"
          );
        }).join("") + "</ol>"
      : '<p class="timeline-note">暂无公开任职经历，待补充。</p>';

    var honorsHtml = (p.honors || []).length
      ? '<ul class="honor-list">' + p.honors.map(function (h) {
          return "<li><span class=\"honor-date\">" + escapeHtml(h.date || "") + "</span><span>" +
            escapeHtml(h.title || "") + (h.note ? "（" + escapeHtml(h.note) + "）" : "") + "</span></li>";
        }).join("") + "</ul>"
      : '<p class="timeline-note">暂无公开荣誉记载，待补充。</p>';

    var promotionSteps = p.promotion ? p.promotion.split("→") : [];
    var promotionHtml = promotionSteps.length
      ? '<div class="promotion-flow">' + promotionSteps.map(function (step, i) {
          return (i ? '<span class="promotion-arrow">→</span>' : "") +
            '<span class="promotion-step">' + escapeHtml(step.trim()) + "</span>";
        }).join("") + "</div>"
      : '<p class="timeline-note">暂无公开晋升路径资料，待补充。</p>';

    var sourcesHtml = (p.sources || []).length
      ? '<ul class="source-list">' + p.sources.map(function (s) {
          var url = s.url || "";
          var label = s.label || url;
          if (url) {
            return '<li><a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' +
              escapeHtml(label) + "</a></li>";
          }
          return "<li>" + escapeHtml(label) + "</li>";
        }).join("") + "</ul>"
      : '<p class="timeline-note">暂无来源。</p>';

    var html =
      '<div class="detail-hero">' +
        '<div class="detail-hero-top">' +
          '<div class="avatar ' + teamClass(p) + '">' + escapeHtml((p.name || "?").charAt(0)) + "</div>" +
          "<div>" +
            '<h2 class="detail-name">' + escapeHtml(p.name) + "</h2>" +
            '<p class="detail-role">' + escapeHtml(p.currentRoles || "职务待补充") + "</p>" +
            '<div class="teams">' + teamChips(p) + "</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="detail-body">' +
        (infoRows.length ? '<dl class="info-grid">' + infoRows.map(function (row) {
          return '<div class="info-cell"><dt>' + escapeHtml(row[0]) + "</dt><dd>" + escapeHtml(row[1]) + "</dd></div>";
        }).join("") + "</dl>" : "") +
        '<section class="section"><h3 class="section-title">' + icon("route") + "成长轨迹 / 任职经历</h3>" + careerHtml + "</section>" +
        '<section class="section"><h3 class="section-title">' + icon("award") + "所获荣誉</h3>" + honorsHtml + "</section>" +
        '<section class="section"><h3 class="section-title">' + icon("sparkle") + "晋升路径</h3>" + promotionHtml + "</section>" +
        '<section class="section"><h3 class="section-title">' + icon("link") + "资料来源</h3>" + sourcesHtml + "</section>" +
        (p.note ? '<div class="note-box">' + escapeHtml(p.note) + "</div>" : "") +
      "</div>";

    els.detailBody.innerHTML = html;
    if (typeof els.detail.showModal === "function") {
      els.detail.showModal();
    } else {
      els.detail.setAttribute("open", "");
    }
  }

  function closeDetail() {
    if (typeof els.detail.close === "function") {
      els.detail.close();
    } else {
      els.detail.removeAttribute("open");
    }
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        field += ch;
        i += 1;
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (ch === ",") {
        row.push(field);
        field = "";
        i += 1;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
    }
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ""; }); });
  }

  function csvToPeople(text) {
    var rows = parseCsv(text.replace(/^\uFEFF/, ""));
    if (!rows.length) return [];
    var headers = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (row, index) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = (row[i] || "").trim(); });
      return normalizePerson(obj, index);
    });
  }

  function normalizePerson(raw, index) {
    function entries(text) {
      return String(text || "").split("；").map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
        var parts = s.split("|");
        return {
          period: (parts[0] || "").trim(),
          role: (parts[1] || "").trim(),
          note: (parts[2] || "").trim()
        };
      });
    }
    var sources = String(raw.sources || "").split("；").map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      var parts = s.split("|");
      return { label: (parts[0] || "").trim(), url: (parts[1] || "").trim() };
    });
    return {
      id: raw.id || "import-" + (index + 1),
      name: raw.name || "",
      teams: String(raw.teams || "").split("/").map(function (t) { return t.trim(); }).filter(Boolean),
      currentRoles: raw.current_roles || "",
      gender: raw.gender || "",
      ethnicity: raw.ethnicity || "",
      birthDate: raw.birth_date || "",
      nativePlace: raw.native_place || "",
      partyJoin: raw.party_join || "",
      workStart: raw.work_start || "",
      education: raw.education || "",
      degree: raw.degree || "",
      career: entries(raw.career),
      honors: entries(raw.honors),
      promotion: raw.promotion || "",
      sources: sources,
      note: raw.note || ""
    };
  }

  function csvCell(value) {
    var text = String(value == null ? "" : value);
    if (/[",\r\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function exportCsv() {
    var headers = [
      "id", "name", "teams", "current_roles", "gender", "ethnicity", "birth_date",
      "native_place", "party_join", "work_start", "education", "degree", "career",
      "honors", "promotion", "sources", "note"
    ];
    function joinEntries(items) {
      return (items || []).map(function (item) {
        var parts = [item.period || item.date || "", item.role || item.title || "", item.note || ""];
        while (parts.length && !parts[parts.length - 1]) parts.pop();
        return parts.join("|");
      }).join("；");
    }
    function joinSources(items) {
      return (items || []).map(function (s) {
        return s.label + (s.url ? "|" + s.url : "");
      }).join("；");
    }
    var lines = [headers.map(csvCell).join(",")];
    state.people.forEach(function (p) {
      lines.push(headers.map(function (h) {
        switch (h) {
          case "teams": return csvCell((p.teams || []).join("/"));
          case "current_roles": return csvCell(p.currentRoles);
          case "birth_date": return csvCell(p.birthDate);
          case "native_place": return csvCell(p.nativePlace);
          case "party_join": return csvCell(p.partyJoin);
          case "work_start": return csvCell(p.workStart);
          case "career": return csvCell(joinEntries(p.career));
          case "honors": return csvCell(joinEntries(p.honors));
          case "promotion": return csvCell(p.promotion);
          case "sources": return csvCell(joinSources(p.sources));
          default: return csvCell(p[h]);
        }
      }).join(","));
    });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "永城市四套班子人才库.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  els.search.addEventListener("input", function () {
    state.search = els.search.value;
    renderCards();
  });

  els.teamFilter.addEventListener("click", function (event) {
    var button = event.target.closest(".seg");
    if (!button) return;
    state.team = button.getAttribute("data-team");
    els.teamFilter.querySelectorAll(".seg").forEach(function (el) { el.classList.remove("active"); });
    button.classList.add("active");
    renderCards();
  });

  els.typeFilter.addEventListener("change", function () {
    state.type = els.typeFilter.value;
    renderCards();
  });

  els.sortSelect.addEventListener("change", function () {
    state.sort = els.sortSelect.value;
    renderCards();
  });

  els.cards.addEventListener("click", function (event) {
    var card = event.target.closest(".card");
    if (card) openPersonById(card.getAttribute("data-id"));
  });

  els.cards.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var card = event.target.closest(".card");
    if (card) {
      event.preventDefault();
      openPersonById(card.getAttribute("data-id"));
    }
  });

  function openPersonById(id) {
    var person = state.people.find(function (p) { return String(p.id) === id; });
    if (person) openDetail(person);
  }

  els.closeDetail.addEventListener("click", closeDetail);
  els.detail.addEventListener("click", function (event) {
    if (event.target === els.detail) closeDetail();
  });

  els.importBtn.addEventListener("click", function () {
    els.csvInput.value = "";
    els.csvInput.click();
  });

  els.csvInput.addEventListener("change", function () {
    var file = els.csvInput.files && els.csvInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var people = csvToPeople(String(reader.result || ""));
        if (!people.length) throw new Error("CSV 中没有可用的数据行");
        state.people = people;
        saveState();
        renderAll();
      } catch (err) {
        window.alert("导入失败：" + err.message);
      }
    };
    reader.readAsText(file, "utf-8");
  });

  els.exportBtn.addEventListener("click", exportCsv);

  els.resetBtn.addEventListener("click", function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
    state.people = defaultData.people.map(clonePerson);
    renderAll();
  });

  renderAll();
})();
