(function () {
  const form = document.querySelector("#intakeForm");
  const result = document.querySelector("#result");
  const agencyNoteTopSlot = document.querySelector("#agencyNoteTopSlot");
  const agencyNoteOriginalSlot = document.querySelector("#agencyNoteOriginalSlot");
  const agencyNoteField = document.querySelector("#agencyNoteField");
  const agencyLicenseNotice = document.querySelector("#agencyLicenseNotice");
  const noteRequiredMark = document.querySelector("#noteRequiredMark");
  const modePill = document.querySelector("#modePill");
  const bundleOutput = document.querySelector("#bundleOutput");
  const creationDateOutput = document.querySelector("#creationDateOutput");
  const excelStatus = document.querySelector("#excelStatus");
  const excelPanel = document.querySelector("#excelPanel");
  const adminPanel = document.querySelector(".admin-panel");
  const modeCards = Array.from(document.querySelectorAll("[data-entry-mode]"));
  const recognitionHint = document.querySelector("#recognitionHint");
  const core = window.MolocoIntakeCore;
  const DEFAULT_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxkk2de7YLmx9tl9S_GDAYFVoBl4RsIyHGIFhXd9TcUrDtKkWX__f57xcZVaitCLbHd/exec";
  const SCRIPT_URL_STORAGE_KEY = "molocoCustomerIntakeScriptUrl";
  let productFormatTimer;
  let productPageRecognitionTimer;
  let lastProductPageRecognitionKey = "";
  let lastProductPageRecognition;

  function setRecognitionHint(message) {
    if (recognitionHint) {
      recognitionHint.value = message;
    }
  }

  function resizeTextarea(element) {
    if (!element || !element.matches("textarea[data-autogrow]")) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  function resizeTextareas() {
    form.querySelectorAll("textarea[data-autogrow]").forEach(resizeTextarea);
  }

  function setupDatalistFullPicker() {
    form.querySelectorAll("input[list]").forEach((input) => {
      input.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !input.value || typeof input.showPicker !== "function") return;

        const rect = input.getBoundingClientRect();
        const isPickerArea = event.clientX >= rect.right - 44;
        if (!isPickerArea) return;

        const originalValue = input.value;
        let hasSelection = false;

        const cleanup = () => {
          input.removeEventListener("input", markSelection);
          input.removeEventListener("change", cleanup);
          input.removeEventListener("blur", restoreIfEmpty);
          input.removeEventListener("keydown", restoreOnEscape);
          document.removeEventListener("pointerdown", restoreOnOutsidePointer, true);
        };
        const markSelection = () => {
          hasSelection = true;
          cleanup();
        };
        const restoreIfEmpty = () => {
          if (!hasSelection && !input.value) {
            input.value = originalValue;
          }
          cleanup();
        };
        const restoreOnEscape = (keyEvent) => {
          if (keyEvent.key === "Escape") {
            restoreIfEmpty();
          }
        };
        const restoreOnOutsidePointer = (pointerEvent) => {
          if (pointerEvent.target !== input) {
            restoreIfEmpty();
          }
        };

        event.preventDefault();
        input.focus();
        input.value = "";
        input.addEventListener("input", markSelection);
        input.addEventListener("change", cleanup);
        input.addEventListener("blur", restoreIfEmpty);
        input.addEventListener("keydown", restoreOnEscape);
        window.setTimeout(() => {
          document.addEventListener("pointerdown", restoreOnOutsidePointer, true);
        }, 0);

        try {
          input.showPicker();
        } catch (_error) {
          restoreIfEmpty();
        }
      });
    });
  }

  function todayText() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  }

  function addDays(dateText, days) {
    const date = new Date(`${dateText}T00:00:00+08:00`);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  }

  function getFormInput() {
    const data = new FormData(form);
    return Object.fromEntries(data.entries());
  }

  function setResult(type, message) {
    result.hidden = false;
    result.className = `result ${type}`;
    result.textContent = message;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearResult() {
    result.hidden = true;
    result.textContent = "";
  }

  function setEntryMode(mode) {
    modeCards.forEach((card) => {
      const isActive = card.dataset.entryMode === mode;
      card.classList.toggle("active", isActive);
      card.setAttribute("aria-pressed", String(isActive));
    });
    excelPanel.hidden = mode !== "excel";
  }

  function setDefaultDates() {
    creationDateOutput.value = todayText();
    if (!form.elements.expectedLaunchDate.value) {
      form.elements.expectedLaunchDate.value = addDays(todayText(), 14);
    }
  }

  function updateAgencyState() {
    const isAgency = form.elements.isAgency.value === "是";
    noteRequiredMark.hidden = !isAgency;
    agencyNoteField.hidden = false;
    agencyNoteTopSlot.hidden = !isAgency;
    agencyLicenseNotice.hidden = false;
    form.elements.note.required = isAgency;
    form.elements.note.placeholder = isAgency
      ? "请上传营业执照到飞书网盘后，粘贴单个文件链接"
      : "可填写补充说明";

    const targetSlot = isAgency ? agencyNoteTopSlot : agencyNoteOriginalSlot;
    if (agencyNoteField.parentElement !== targetSlot) {
      targetSlot.appendChild(agencyNoteField);
    }
    if (agencyLicenseNotice.parentElement !== targetSlot) {
      targetSlot.appendChild(agencyLicenseNotice);
    }

    if (isAgency) {
      form.elements.genre.value = "Agency";
      form.elements.subGenre.value = "";
    }
  }

  function getScriptUrl() {
    return (
      form.elements.scriptUrl.value.trim() ||
      window.localStorage.getItem(SCRIPT_URL_STORAGE_KEY) ||
      DEFAULT_SCRIPT_URL
    ).trim();
  }

  function setInitialScriptUrl() {
    const scriptUrl = getScriptUrl();
    if (scriptUrl) {
      form.elements.scriptUrl.value = scriptUrl;
    }
  }

  function autoFormatEmailField() {
    const emails = core.normalizeEmailInput(form.elements.email.value);
    if (emails.length) {
      form.elements.email.value = emails.join("\n");
      resizeTextarea(form.elements.email);
    }
  }

  function autoFormatProductLinks() {
    const links = core.normalizeProductLinks(form.elements.productLinks.value);
    if (links.length) {
      form.elements.productLinks.value = links.join("\n");
      resizeTextarea(form.elements.productLinks);
    }
  }

  function normalizeDateInput(value) {
    const text = String(value || "").trim();
    if (/^\d{5}(\.\d+)?$/.test(text)) {
      const date = new Date((Number(text) - 25569) * 86400 * 1000);
      return date.toISOString().slice(0, 10);
    }
    const match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (!match) return text;
    return [match[1], match[2].padStart(2, "0"), match[3].padStart(2, "0")].join("-");
  }

  function mergeMappedInputs(...inputs) {
    return inputs.reduce((merged, input) => {
      Object.entries(input || {}).forEach(([key, value]) => {
        if (String(value || "").trim()) {
          merged[key] = value;
        }
      });
      return merged;
    }, {});
  }

  function applyMappedSpreadsheetInput(mapped) {
    const fieldNames = [
      "agencySales",
      "companyName",
      "entityName",
      "clientLastName",
      "clientFirstName",
      "contactRole",
      "email",
      "molocoSales",
      "productLinks",
      "genre",
      "subGenre",
      "geo",
      "expectedLaunchDate",
      "comments",
      "stage",
      "budgetBucket",
      "dailySpend",
      "agency",
      "newCustomerStatus",
      "note",
    ];
    let filledCount = 0;
    const filledLabels = [];

    if (mapped.isAgency) {
      const agencyRadio = Array.from(form.elements.isAgency).find(
        (item) => item.value === mapped.isAgency
      );
      if (agencyRadio) {
        agencyRadio.checked = true;
        filledCount += 1;
        filledLabels.push("是否为 Agency");
      }
    }

    fieldNames.forEach((name) => {
      const element = form.elements[name];
      const value = name === "expectedLaunchDate" ? normalizeDateInput(mapped[name]) : mapped[name];
      if (!element || !value) return;
      element.value = value;
      delete element.dataset.edited;
      filledCount += 1;
      filledLabels.push(element.closest("label")?.querySelector("span")?.textContent?.replace("*", "").trim() || name);
    });

    autoFormatEmailField();
    autoFormatProductLinks();
    updateRecognition();
    resizeTextareas();
    scheduleProductPageRecognition();
    return { filledCount, filledLabels };
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.addEventListener("error", () => reject(reader.error || new Error("读取文件失败")));
      reader.readAsText(file);
    });
  }

  function readArrayBufferFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(reader.error || new Error("读取文件失败")));
      reader.readAsArrayBuffer(file);
    });
  }

  function findEndOfCentralDirectory(bytes) {
    for (let index = bytes.length - 22; index >= 0; index -= 1) {
      if (
        bytes[index] === 0x50 &&
        bytes[index + 1] === 0x4b &&
        bytes[index + 2] === 0x05 &&
        bytes[index + 3] === 0x06
      ) {
        return index;
      }
    }
    throw new Error("未能读取 Excel 文件结构");
  }

  async function inflateRaw(bytes) {
    if (!window.DecompressionStream) {
      throw new Error("当前浏览器不支持直接解析 xlsx，请另存为 CSV UTF-8 后上传");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzipXlsxEntries(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder("utf-8");
    const endIndex = findEndOfCentralDirectory(bytes);
    const fileCount = view.getUint16(endIndex + 10, true);
    let centralDirectoryOffset = view.getUint32(endIndex + 16, true);
    const entries = {};

    for (let fileIndex = 0; fileIndex < fileCount; fileIndex += 1) {
      const signature = view.getUint32(centralDirectoryOffset, true);
      if (signature !== 0x02014b50) {
        throw new Error("Excel 文件目录读取失败");
      }

      const compressionMethod = view.getUint16(centralDirectoryOffset + 10, true);
      const compressedSize = view.getUint32(centralDirectoryOffset + 20, true);
      const fileNameLength = view.getUint16(centralDirectoryOffset + 28, true);
      const extraLength = view.getUint16(centralDirectoryOffset + 30, true);
      const commentLength = view.getUint16(centralDirectoryOffset + 32, true);
      const localHeaderOffset = view.getUint32(centralDirectoryOffset + 42, true);
      const fileName = decoder.decode(
        bytes.slice(centralDirectoryOffset + 46, centralDirectoryOffset + 46 + fileNameLength)
      );

      const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);

      if (compressionMethod === 0) {
        entries[fileName] = decoder.decode(compressed);
      } else if (compressionMethod === 8) {
        entries[fileName] = decoder.decode(await inflateRaw(compressed));
      }

      centralDirectoryOffset += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
  }

  async function parseXlsxFile(file) {
    const entries = await unzipXlsxEntries(await readArrayBufferFile(file));
    const worksheetName = core.selectXlsxWorksheetName(entries);
    if (!worksheetName) {
      throw new Error("未在 Excel 中找到工作表");
    }
    const sharedStringsXml = entries["xl/sharedStrings.xml"] || "";
    const sheetXml = entries[worksheetName];
    return {
      cells: core.parseXlsxCells(sharedStringsXml, sheetXml),
      worksheetName,
      rows: core.parseXlsxXmlTable(sharedStringsXml, sheetXml),
    };
  }

  function scheduleProductLinkFormatting() {
    window.clearTimeout(productFormatTimer);
    productFormatTimer = window.setTimeout(() => {
      const before = form.elements.productLinks.value;
      autoFormatProductLinks();
      if (form.elements.productLinks.value !== before) {
        updateRecognition();
      }
      scheduleProductPageRecognition();
    }, 250);
  }

  function updateModePill() {
    const scriptUrl = getScriptUrl();
    modePill.textContent = scriptUrl ? "同步已配置" : "待配置同步";
  }

  function updateAdminPanelVisibility() {
    if (!adminPanel) return;
    const adminMode = new URLSearchParams(window.location.search).get("admin") === "1";
    adminPanel.hidden = Boolean(DEFAULT_SCRIPT_URL) && !adminMode;
  }

  function setAutoValue(element, value) {
    element.value = value;
    element.dataset.autoValue = value;
  }

  function canReplaceAutoValue(element) {
    return !element.dataset.edited || element.value === element.dataset.autoValue;
  }

  function updateRecognition() {
    setDefaultDates();
    updateAgencyState();

    const input = getFormInput();
    const emails = core.normalizeEmailInput(input.email);
    const primaryEmail = emails[0] || "";
    const names = core.inferNamesFromEmails(primaryEmail);
    const bundleIds = core.extractBundleIds(input.productLinks);
    const isAgency = input.isAgency === "是";
    const category = core.guessCategoryFromProductLinks(input.productLinks, isAgency);
    const effectiveCategory = lastProductPageRecognition || category;
    const missingCommentParts = [];

    if (canReplaceAutoValue(form.elements.clientLastName)) {
      setAutoValue(form.elements.clientLastName, names.lastName);
    }
    if (canReplaceAutoValue(form.elements.clientFirstName)) {
      setAutoValue(form.elements.clientFirstName, names.firstName);
    }
    if (canReplaceAutoValue(form.elements.entityName)) {
      setAutoValue(
        form.elements.entityName,
        core.keepEnglishEntityName(lastProductPageRecognition?.entityName || "")
      );
    }
    if (effectiveCategory.genre && canReplaceAutoValue(form.elements.genre)) {
      setAutoValue(form.elements.genre, effectiveCategory.genre);
    }
    if (effectiveCategory.subGenre && canReplaceAutoValue(form.elements.subGenre)) {
      setAutoValue(form.elements.subGenre, effectiveCategory.subGenre);
    }
    if (canReplaceAutoValue(form.elements.comments)) {
      const genre = form.elements.genre.value;
      const subGenre = form.elements.subGenre.value;
      const categoryText = [genre, subGenre].filter(Boolean).join(" / ") || "待人工确认";
      setAutoValue(
        form.elements.comments,
        input.geo ? `客户品类为 ${categoryText}，投放地区为 ${input.geo}。` : ""
      );
    }
    if (!form.elements.genre.value && !form.elements.subGenre.value && !input.geo) {
      form.elements.comments.placeholder = "根据品类、投放地点自动生成";
    } else {
      if (!form.elements.genre.value && !form.elements.subGenre.value) {
        missingCommentParts.push("品类");
      }
      if (!input.geo) {
        missingCommentParts.push("投放地点");
      }
      form.elements.comments.placeholder = missingCommentParts.length
        ? `请补充${missingCommentParts.join("、")}内容`
        : "根据品类、投放地点自动生成";
    }
    if (isAgency && !form.elements.note.value) {
      form.elements.note.placeholder = "请上传营业执照到飞书网盘后，粘贴单个文件链接";
    }
    bundleOutput.value = bundleIds.join("\n");
    resizeTextareas();
    if (lastProductPageRecognition) {
      setRecognitionHint([
        `邮箱：识别到 ${emails.length} 个有效邮箱，提交时使用第一个。`,
        `品类：${lastProductPageRecognition.confidence}`,
        lastProductPageRecognition.entityName
          ? `主体名称：从产品页面识别到 ${lastProductPageRecognition.entityName}`
          : "主体名称：产品页面未识别到开发者/主体名称",
        `识别链接：${lastProductPageRecognition.sourceUrl || "产品链接"}`,
      ].join("\n"));
    } else {
      setRecognitionHint([
        `邮箱：识别到 ${emails.length} 个有效邮箱，提交时使用第一个。`,
        `品类：${category.confidence}。配置 Apps Script 后会自动进入产品页面识别。`,
        isAgency
          ? "主体名称：Agency 需根据上传的营业执照识别英文主体名称。"
          : "主体名称：配置 Apps Script 后会自动尝试从产品页面识别英文主体名称。",
      ].join("\n"));
    }
  }

  async function submitToScript(scriptUrl, submission) {
    const response = await fetch(scriptUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ values: submission.values, rowObject: submission.rowObject }),
    });
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.message || "提交失败");
    }
    return payload;
  }

  async function classifyProductViaScript(scriptUrl, productLinks) {
    const response = await fetch(scriptUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "classifyProduct", productLinks }),
    });
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.message || "产品页面识别失败");
    }
    return payload;
  }

  function applyProductPageRecognition(category) {
    const entityName = core.keepEnglishEntityName(category.entityName || "");
    if (category.genre && canReplaceAutoValue(form.elements.genre)) {
      setAutoValue(form.elements.genre, category.genre);
      delete form.elements.genre.dataset.edited;
    }
    if (category.subGenre && canReplaceAutoValue(form.elements.subGenre)) {
      setAutoValue(form.elements.subGenre, category.subGenre);
      delete form.elements.subGenre.dataset.edited;
    }
    if (entityName && canReplaceAutoValue(form.elements.entityName)) {
      setAutoValue(form.elements.entityName, entityName);
      delete form.elements.entityName.dataset.edited;
    }
    setRecognitionHint([
      `品类：${category.confidence}`,
      entityName ? `主体名称：从产品页面识别到 ${entityName}` : "主体名称：产品页面未识别到英文开发者/主体名称",
      `识别链接：${category.sourceUrl || "产品链接"}`,
    ].join("\n"));
    lastProductPageRecognition = { ...category, entityName };
  }

  function scheduleProductPageRecognition() {
    window.clearTimeout(productPageRecognitionTimer);
    productPageRecognitionTimer = window.setTimeout(async () => {
      const input = getFormInput();
      const scriptUrl = getScriptUrl();
      const links = core.normalizeProductLinks(input.productLinks);
      if (!scriptUrl || !links.length) return;

      const key = `${scriptUrl}::${links[0]}`;
      if (key === lastProductPageRecognitionKey) return;
      lastProductPageRecognitionKey = key;
      lastProductPageRecognition = null;

      try {
        setRecognitionHint("正在通过产品页面识别品类和主体名称...");
        const category = await classifyProductViaScript(scriptUrl, links.join("\n"));
        applyProductPageRecognition(category);
        updateRecognition();
      } catch (error) {
        setRecognitionHint([
          "产品页面联网识别失败，已保留本地规则识别结果。",
          error.message || "请确认 Apps Script Web App URL 已重新部署新版本。",
        ].join("\n"));
      }
    }, 900);
  }

  function resetDefaults() {
    form.elements.contactRole.value = "UA";
    form.elements.dailySpend.value = "300";
    form.elements.budgetBucket.value = "尾部(<1k)";
    form.elements.stage.value = "开户中";
    form.elements.agency.value = "Madhouse";
    form.elements.newCustomerStatus.value = "New";
    delete form.elements.clientLastName.dataset.edited;
    delete form.elements.clientFirstName.dataset.edited;
    delete form.elements.entityName.dataset.edited;
    delete form.elements.genre.dataset.edited;
    delete form.elements.subGenre.dataset.edited;
    delete form.elements.comments.dataset.edited;
    excelStatus.textContent = "尚未上传文件";
    setDefaultDates();
    updateRecognition();
    updateModePill();
    resizeTextareas();
  }

  function markEditedWhenDifferent(element) {
    if (element.value !== element.dataset.autoValue) {
      element.dataset.edited = "true";
    } else {
      delete element.dataset.edited;
    }
  }

  form.elements.clientLastName.addEventListener("input", () =>
    markEditedWhenDifferent(form.elements.clientLastName)
  );
  form.elements.clientFirstName.addEventListener("input", () =>
    markEditedWhenDifferent(form.elements.clientFirstName)
  );
  form.elements.entityName.addEventListener("input", () =>
    markEditedWhenDifferent(form.elements.entityName)
  );
  form.elements.genre.addEventListener("input", () => markEditedWhenDifferent(form.elements.genre));
  form.elements.subGenre.addEventListener("input", () =>
    markEditedWhenDifferent(form.elements.subGenre)
  );
  form.elements.comments.addEventListener("input", () =>
    markEditedWhenDifferent(form.elements.comments)
  );

  form.elements.email.addEventListener("blur", () => {
    autoFormatEmailField();
    updateRecognition();
  });
  form.elements.productLinks.addEventListener("blur", () => {
    autoFormatProductLinks();
    updateRecognition();
    scheduleProductPageRecognition();
  });
  form.elements.productLinks.addEventListener("paste", () => {
    window.setTimeout(() => {
      autoFormatProductLinks();
      updateRecognition();
      scheduleProductPageRecognition();
    }, 0);
  });
  form.elements.productLinks.addEventListener("input", scheduleProductLinkFormatting);

  modeCards.forEach((card) => {
    card.addEventListener("click", () => {
      setEntryMode(card.dataset.entryMode);
      if (card.dataset.entryMode === "excel") {
        form.elements.excelFile.focus();
      }
    });
  });

  form.elements.excelFile.addEventListener("change", async () => {
    const file = form.elements.excelFile.files[0];
    if (!file) {
      excelStatus.textContent = "尚未上传文件";
      return;
    }

    if (/\.xls$/i.test(file.name)) {
      excelStatus.textContent =
        `已选择：${file.name}。.xls 是老格式，当前入口不能直接读取；请在 Excel 里另存为 .xlsx 或 CSV UTF-8 后上传。`;
      return;
    }

    try {
      excelStatus.textContent = `正在读取：${file.name}`;
      const parsed = /\.xlsx$/i.test(file.name)
        ? await parseXlsxFile(file)
        : { rows: core.parseDelimitedTable(await readTextFile(file)), cells: {} };
      if (!parsed.rows.length && !Object.keys(parsed.cells).length) {
        excelStatus.textContent = "未识别到可用数据，请确认文件里有客户信息。";
        return;
      }
      const rowMapped = parsed.rows.length ? core.mapSpreadsheetRowToInput(parsed.rows[0]) : {};
      const cellMapped = core.mapOpeningSheetCellsToInput(parsed.cells);
      const mapped = mergeMappedInputs(rowMapped, cellMapped);
      const { filledCount } = applyMappedSpreadsheetInput(mapped);
      excelStatus.textContent = filledCount
        ? "上传成功"
        : "上传成功，但没有匹配到可填写字段";
    } catch (error) {
      excelStatus.textContent = error.message || "读取文件失败，请检查文件格式。";
    }
  });

  form.addEventListener("input", updateRecognition);
  form.querySelectorAll("textarea[data-autogrow]").forEach((textarea) => {
    textarea.addEventListener("input", () => resizeTextarea(textarea));
  });
  form.addEventListener("change", updateRecognition);
  form.elements.scriptUrl.addEventListener("input", () => {
    const scriptUrl = form.elements.scriptUrl.value.trim();
    if (scriptUrl) {
      window.localStorage.setItem(SCRIPT_URL_STORAGE_KEY, scriptUrl);
    } else {
      window.localStorage.removeItem(SCRIPT_URL_STORAGE_KEY);
    }
    updateModePill();
    lastProductPageRecognitionKey = "";
    scheduleProductPageRecognition();
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      clearResult();
      lastProductPageRecognitionKey = "";
      lastProductPageRecognition = null;
      resetDefaults();
    }, 0);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    updateRecognition();

    const input = getFormInput();
    const scriptUrl = getScriptUrl();
    const submission = core.buildSubmission(input);

    if (submission.errors.length) {
      setResult("error", submission.errors.join("\n"));
      return;
    }

    if (!scriptUrl) {
      setResult(
        "error",
        "管理员尚未配置 Apps Script Web App URL，暂时无法提交到 Google Sheet。"
      );
      return;
    }

    try {
      setResult("preview", "正在提交...");
      const payload = await submitToScript(scriptUrl, submission);
      setResult("success", `提交成功，已写入第 ${payload.rowNumber} 行。`);
      form.reset();
      form.elements.scriptUrl.value = scriptUrl;
      resetDefaults();
    } catch (error) {
      setResult("error", error.message || "提交失败，请稍后重试");
    }
  });

  setInitialScriptUrl();
  setEntryMode("manual");
  setupDatalistFullPicker();
  updateAdminPanelVisibility();
  resetDefaults();
  resizeTextareas();
})();
