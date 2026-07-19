(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MolocoIntakeCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const REQUIRED_FIELDS = [
    ["agencySales", "代理商销售为必填"],
    ["companyName", "输入客户简称"],
    ["email", "邮箱为必填"],
    ["molocoSales", "Moloco Sales 为必填"],
    ["productLinks", "产品链接为必填"],
    ["isAgency", "是否为 Agency 为必填"],
    ["geo", "投放地区为必填"],
    ["dailySpend", "预估日预算为必填"],
  ];
  const SPREADSHEET_FIELD_ALIASES = {
    agencySales: ["代理商销售", "代理销售", "销售", "agency sales", "agencySales"],
    companyName: ["客户名", "客户名称", "客户公司", "广告主", "公司名称", "companyName", "customer", "advertiser"],
    entityName: ["主体名称", "主体名称英文", "英文主体", "entityName", "entity"],
    clientLastName: ["客户姓", "客户-姓", "联系人姓", "lastName", "last name"],
    clientFirstName: ["客户名联系人", "客户-名", "联系人名", "firstName", "first name"],
    contactRole: ["职位", "联系人职位", "role", "title"],
    email: ["客户邮箱", "联系人邮箱", "邮箱", "email", "e-mail"],
    molocoSales: ["Moloco Sales", "Moloco AM", "Moloco销售", "Moloco负责人", "Moloco对接人"],
    productLinks: ["产品链接", "应用链接", "商店链接", "App URL", "App Link", "productLinks", "url"],
	    isAgency: ["是否为Agency", "是否 Agency", "Agency", "isAgency", "是否代理"],
	    isExistingAccount: ["是否老账户", "老账户", "Existing Account", "isExistingAccount"],
	    adAccountName: ["广告账户名", "广告账户名称", "Ad Account Name", "adAccountName"],
	    genre: ["品类", "一级品类", "genre", "category"],
    subGenre: ["子品类", "二级品类", "subGenre", "subcategory"],
    geo: ["投放地区", "投放国家", "国家", "地区", "geo", "region", "country"],
    expectedLaunchDate: ["预计上线日期", "上线日期", "预计上线时间", "launch date"],
    comments: ["合作情况", "comments", "合作备注"],
    stage: ["状态", "stage", "status"],
    budgetBucket: ["重点客户大媒体日预算", "预算档位", "budgetBucket"],
    dailySpend: ["预估日预算", "日预算", "Daily Budget", "dailySpend", "daily budget"],
    agency: ["Agency", "代理", "代理商"],
    newCustomerStatus: ["是否新户", "newCustomerStatus", "new customer"],
    note: ["Note", "备注", "说明"],
  };
	  const MOLOCO_SALES_BY_EMAIL = {
	    "nina.cui@moloco.com": "Nina Cui",
	    "ron.chen@moloco.com": "Ron Chen",
	    "jolie.zhang@moloco.com": "Jolie Zhang",
	    "kimmy.lin@moloco.com": "Kimmy Lin",
	    "sharon.kong@moloco.com": "Sharon Kong",
	  };
	  const ALLOWED_GENRES = new Set([
	    "Casual",
	    "Core",
	    "Slots/Social Casino",
	    "RealMoney",
	    "Scratcher",
	    "Non-gaming",
	    "Agency",
	  ]);
	  const ALLOWED_SUB_GENRES = new Set([
	    "Casual-IAA",
	    "Casual-IAP",
	    "RPG",
	    "SLG",
	    "Action",
	    "Simulation",
	    "Slots/Social Casino",
	    "RealMoney",
	    "Scratcher",
	    "Social",
	    "e-Commerce",
	    "Fintech",
	    "Reading",
	    "AI tools",
	    "Utility",
	    "Entertainment",
	    "ShortTV",
	    "Sports",
	  ]);
	  const SUB_GENRES_BY_GENRE = {
	    Casual: new Set(["Casual-IAA", "Casual-IAP"]),
	    Core: new Set(["RPG", "SLG", "Action", "Simulation"]),
	    "Slots/Social Casino": new Set(["Slots/Social Casino"]),
	    RealMoney: new Set(["RealMoney"]),
	    Scratcher: new Set(["Scratcher"]),
	    "Non-gaming": new Set([
	      "Social",
	      "e-Commerce",
	      "Fintech",
	      "Reading",
	      "AI tools",
	      "Utility",
	      "Entertainment",
	      "ShortTV",
	      "Sports",
	    ]),
	  };

	  function normalizeText(value) {
	    return String(value ?? "").trim();
	  }

  function normalizeDailySpend(value) {
    const normalized = normalizeText(value);
    if (!normalized) return "";
    const amount = Number(normalized);
    if (Number.isNaN(amount)) return normalized;
    return Math.max(300, amount);
  }

	  function isAllowedGenre(value) {
	    return ALLOWED_GENRES.has(normalizeText(value));
	  }

	  function isAllowedSubGenre(value) {
	    return ALLOWED_SUB_GENRES.has(normalizeText(value));
	  }

	  function isLogicalSubGenre(genre, subGenre) {
	    const normalizedGenre = normalizeText(genre);
	    const normalizedSubGenre = normalizeText(subGenre);
	    if (!normalizedGenre || !normalizedSubGenre) return true;
	    if (normalizedGenre === "Agency") return isAllowedSubGenre(normalizedSubGenre);
	    return Boolean(SUB_GENRES_BY_GENRE[normalizedGenre]?.has(normalizedSubGenre));
	  }

  function splitProductLinks(productLinks) {
    return normalizeText(productLinks)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function splitLines(value) {
    return normalizeText(value)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function parseDelimitedLine(line, delimiter) {
    const cells = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += char;
      }
    }

    cells.push(cell.trim());
    return cells;
  }

  function parseDelimitedTable(text) {
    const normalized = normalizeText(text);
    if (!normalized) return [];

    const delimiter = normalized.split("\n")[0].includes("\t") ? "\t" : ",";
    const rows = normalized
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => parseDelimitedLine(line, delimiter));
    return rowsToObjectsWithDetectedHeader(rows);
  }

  function decodeXmlText(value) {
    return normalizeText(value)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  function stripXmlTags(value) {
    return decodeXmlText(String(value || "").replace(/<[^>]+>/g, ""));
  }

  function extractAttr(xml, name) {
    const match = String(xml || "").match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
    return match ? match[1] : "";
  }

  function columnIndexFromCellRef(cellRef) {
    const letters = String(cellRef || "").match(/^[A-Z]+/i);
    if (!letters) return 0;
    return letters[0]
      .toUpperCase()
      .split("")
      .reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  }

  function parseSharedStrings(sharedStringsXml) {
    const xml = String(sharedStringsXml || "");
    const strings = [];
    const items = xml.match(/<si\b[\s\S]*?<\/si>/gi) || [];

    items.forEach((item) => {
      const parts = [];
      const textMatches = item.match(/<t\b[^>]*>[\s\S]*?<\/t>/gi) || [];
      textMatches.forEach((textNode) => {
        parts.push(stripXmlTags(textNode));
      });
      strings.push(parts.join(""));
    });

    return strings;
  }

  function parseCellValue(cellXml, sharedStrings) {
    const type = extractAttr(cellXml, "t");
    const valueMatch = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
    const inlineMatch = cellXml.match(/<is\b[\s\S]*?<\/is>/i);
    const rawValue = valueMatch ? decodeXmlText(valueMatch[1]) : "";

    if (type === "s") {
      return sharedStrings[Number(rawValue)] || "";
    }
    if (type === "inlineStr" && inlineMatch) {
      return stripXmlTags(inlineMatch[0]);
    }
    return rawValue;
  }

  function parseXlsxXmlTable(sharedStringsXml, sheetXml) {
    const sharedStrings = parseSharedStrings(sharedStringsXml);
    const rows = [];
    const rowMatches = String(sheetXml || "").match(/<row\b[\s\S]*?<\/row>/gi) || [];

    rowMatches.forEach((rowXml) => {
      const row = [];
      const cells = rowXml.match(/<c\b[\s\S]*?<\/c>/gi) || [];
      cells.forEach((cellXml) => {
        const cellRef = extractAttr(cellXml, "r");
        row[columnIndexFromCellRef(cellRef)] = parseCellValue(cellXml, sharedStrings);
      });
      rows.push(row.map((cell) => normalizeText(cell)));
    });

    return rowsToObjectsWithDetectedHeader(rows);
  }

  function parseXlsxCells(sharedStringsXml, sheetXml) {
    const sharedStrings = parseSharedStrings(sharedStringsXml);
    const cells = {};
    const cellMatches = String(sheetXml || "").match(/<c\b[\s\S]*?<\/c>/gi) || [];

    cellMatches.forEach((cellXml) => {
      const cellRef = extractAttr(cellXml, "r").toUpperCase();
      if (cellRef) {
        cells[cellRef] = parseCellValue(cellXml, sharedStrings);
      }
    });

    expandMergedCells(cells, sheetXml);

    return Object.fromEntries(
      Object.entries(cells)
        .filter(([_cellRef, value]) => normalizeText(value))
        .sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))
    );
  }

  function selectXlsxWorksheetName(entries, preferredNames = ["需要查看广告账户的邮箱"]) {
    const workbookXml = entries["xl/workbook.xml"] || "";
    const relsXml = entries["xl/_rels/workbook.xml.rels"] || "";
    const sheets = [];
    const relationships = {};
    const sheetMatches = workbookXml.match(/<sheet\b[^>]*\/?>/gi) || [];
    const relationshipMatches = relsXml.match(/<Relationship\b[^>]*\/?>/gi) || [];

    relationshipMatches.forEach((relationshipXml) => {
      const id = extractAttr(relationshipXml, "Id");
      const target = extractAttr(relationshipXml, "Target");
      if (id && target) {
        relationships[id] = target.startsWith("xl/") ? target : `xl/${target}`;
      }
    });

    sheetMatches.forEach((sheetXml) => {
      const name = extractAttr(sheetXml, "name");
      const relationshipId = extractAttr(sheetXml, "r:id");
      const path = relationships[relationshipId];
      if (name && path && entries[path]) {
        sheets.push({ name, path });
      }
    });

    const preferred = sheets.find((sheet) =>
      preferredNames.some((preferredName) => sheet.name.includes(preferredName))
    );
    if (preferred) return preferred.path;
    if (sheets[0]) return sheets[0].path;

    return Object.keys(entries)
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
      .sort()[0] || "";
  }

  function valueFromCells(cells, refs) {
    for (const ref of refs) {
      const value = normalizeText(cells[String(ref).toUpperCase()]);
      if (value) return value;
    }
    return "";
  }

  function rowValuesFromCells(cells, rowNumber, startColumn = "A", endColumn = "Z") {
    const start = columnIndexFromCellRef(`${startColumn}1`);
    const end = columnIndexFromCellRef(`${endColumn}1`);
    const values = [];

    for (let index = start; index <= end; index += 1) {
      const column = columnNameFromIndex(index);
      const value = normalizeText(cells[`${column}${rowNumber}`]);
      if (value) values.push(value);
    }

    return values;
  }

  function columnNameFromIndex(index) {
    let value = index + 1;
    let name = "";
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function parseCellRef(cellRef) {
    const match = String(cellRef || "").toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    return {
      column: columnIndexFromCellRef(match[1]),
      row: Number(match[2]),
    };
  }

  function cellRefFromPosition(column, row) {
    return `${columnNameFromIndex(column)}${row}`;
  }

  function expandMergedCells(cells, sheetXml) {
    const mergeMatches = String(sheetXml || "").match(/<mergeCell\b[^>]*\bref="[^"]+"[^>]*\/?>/gi) || [];

    mergeMatches.forEach((mergeXml) => {
      const range = extractAttr(mergeXml, "ref").toUpperCase();
      const [startRef, endRef] = range.split(":");
      const start = parseCellRef(startRef);
      const end = parseCellRef(endRef);
      const sourceValue = normalizeText(cells[startRef]);
      if (!start || !end || !sourceValue) return;

      for (let row = start.row; row <= end.row; row += 1) {
        for (let column = start.column; column <= end.column; column += 1) {
          const targetRef = cellRefFromPosition(column, row);
          if (!normalizeText(cells[targetRef])) {
            cells[targetRef] = sourceValue;
          }
        }
      }
    });
  }

  function mapOpeningSheetCellsToInput(cells) {
    const productLinks = normalizeProductLinks(
      [
        rowValuesFromCells(cells, 14, "B", "Z").join("\n"),
      ]
        .filter(Boolean)
        .join("\n")
    );
    const dailySpend = valueFromCells(cells, ["C15", "C16"]);

    return {
      companyName: valueFromCells(cells, ["B3", "C3"]),
      email: normalizeEmailInput(valueFromCells(cells, ["B7", "C7"])).join("\n"),
      molocoSales: normalizeMolocoSales(valueFromCells(cells, ["B8", "C8"])),
      productLinks: productLinks.join("\n"),
      geo: valueFromCells(cells, ["B12"]),
      expectedLaunchDate: valueFromCells(cells, ["B13"]),
      dailySpend,
    };
  }

  function headerScore(row) {
    const aliases = Object.values(SPREADSHEET_FIELD_ALIASES)
      .flat()
      .map(normalizeHeader)
      .filter(Boolean);
    return row.reduce((score, cell) => {
      const header = normalizeHeader(cell);
      if (!header) return score;
      return aliases.some((alias) => header === alias || header.includes(alias)) ? score + 1 : score;
    }, 0);
  }

  function rowsToObjectsWithDetectedHeader(rows) {
    if (!rows.length) return [];

    let headerIndex = 0;
    let bestScore = -1;
    rows.slice(0, 10).forEach((row, index) => {
      const score = headerScore(row);
      if (score > bestScore) {
        bestScore = score;
        headerIndex = index;
      }
    });

    const headers = rows[headerIndex] || [];
    return rows
      .slice(headerIndex + 1)
      .filter((row) => row.some(Boolean))
      .map((row) =>
        headers.reduce((record, header, index) => {
          if (header) {
            record[header] = row[index] || "";
          }
          return record;
        }, {})
      );
  }

  function normalizeHeader(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[()（）_:：/]/g, "");
  }

  function firstMappedValue(row, aliases) {
    const normalizedEntries = Object.entries(row).map(([key, value]) => [
      normalizeHeader(key),
      normalizeText(value),
    ]);

    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias);
      const exact = normalizedEntries.find(([key, value]) => key === normalizedAlias && value);
      if (exact) return exact[1];
    }

    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias);
      const partial = normalizedEntries.find(
        ([key, value]) => value && normalizedAlias.length >= 2 && key.includes(normalizedAlias)
      );
      if (partial) return partial[1];
    }

    return "";
  }

  function normalizeAgencyValue(value) {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return "";
    if (/^(是|yes|y|true|agency|代理)/i.test(normalized)) return "是";
    if (/^(否|no|n|false|direct|直客)/i.test(normalized)) return "否";
    return "";
  }

  function normalizeAgencyName(value) {
    const normalized = normalizeText(value);
    return normalizeAgencyValue(normalized) ? "" : normalized;
  }

  function mapSpreadsheetRowToInput(row) {
    return {
      agencySales: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.agencySales),
      companyName: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.companyName),
      entityName: keepEnglishEntityName(
        firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.entityName)
      ),
      clientLastName: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.clientLastName),
      clientFirstName: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.clientFirstName),
      contactRole: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.contactRole),
      email: normalizeEmailInput(firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.email)).join("\n"),
      molocoSales: normalizeMolocoSales(firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.molocoSales)),
      productLinks: normalizeProductLinks(
        firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.productLinks)
      ).join("\n"),
	      isAgency: normalizeAgencyValue(firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.isAgency)),
	      isExistingAccount: normalizeAgencyValue(
	        firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.isExistingAccount)
	      ),
	      adAccountName: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.adAccountName),
	      genre: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.genre),
      subGenre: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.subGenre),
      geo: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.geo),
      expectedLaunchDate: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.expectedLaunchDate),
      comments: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.comments),
      stage: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.stage),
      budgetBucket: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.budgetBucket),
      dailySpend: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.dailySpend),
      agency: normalizeAgencyName(firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.agency)),
      newCustomerStatus: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.newCustomerStatus),
      note: firstMappedValue(row, SPREADSHEET_FIELD_ALIASES.note),
    };
  }

  function normalizeEmailInput(value) {
    const matches = normalizeText(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
    return matches || [];
  }

  function normalizeMolocoSales(value) {
    const normalized = normalizeText(value);
    const email = normalizeEmailInput(normalized).find((item) => /@moloco\.com$/i.test(item));
    if (email) {
      return MOLOCO_SALES_BY_EMAIL[email.toLowerCase()] || normalized;
    }
    return normalized;
  }

  function normalizeProductLinks(value) {
    const prepared = normalizeText(value).replace(/(https?:\/\/)/gi, "\n$1");
    const matches = prepared.match(/https?:\/\/[^\s，,;；]+/gi);
    return matches ? matches.map((link) => link.trim()).filter(Boolean) : splitLines(value);
  }

  function classifyCategoryFromPageText(pageText) {
    const text = normalizeText(pageText).toLowerCase();
    const result = { genre: "", subGenre: "", confidence: "未能从产品页面内容判断品类" };
    if (!text) return result;

    const hasAds = /contains ads|contains advertising|广告/.test(text);
    const hasIap = /in-app purchases|in app purchases|内购|应用内购买/.test(text);

    const rules = [
      [/real money|realmoney|betting|cash reward|withdraw|真钱|提现|博彩|投注|现金奖励|现实价值/, "RealMoney", "RealMoney"],
      [/slot|casino|bingo|poker|老虎机|赌场|宾果|扑克/, "Slots/Social Casino", "Slots/Social Casino"],
      [/scratch|scratchcard|刮刮乐|刮奖|即时揭晓/, "Scratcher", "Scratcher"],
      [/role playing|rpg|hero|heroes|guild|equipment|skill|story|角色|装备|技能|剧情|公会|队伍养成|角色养成/, "Core", "RPG"],
      [/strategy|slg|empire|kingdom|alliance|march|resource management|base building|策略|联盟|行军|资源管理|基地建设|长期策略/, "Core", "SLG"],
      [/action|shooting|shooter|fighting|battle royale|real-time combat|射击|格斗|动作|即时战斗|实时操作/, "Core", "Action"],
      [/simulation|simulator|farming|city building|tycoon|life simulation|career simulation|模拟|经营|农场|城市建设|人生|职业模拟/, "Core", "Simulation"],
      [/shopping|e-commerce|ecommerce|marketplace|mall|交易平台|购物|电商/, "Non-gaming", "e-Commerce"],
      [/fintech|bank|loan|wallet|payment|finance|invest|insurance|银行|贷款|钱包|支付|投资|保险/, "Non-gaming", "Fintech"],
      [/novel|comic|ebook|reading|news|小说|漫画|阅读|新闻|电子书/, "Non-gaming", "Reading"],
      [/\bai\b|chatbot|gpt|generator|ai assistant|ai生成|ai聊天|ai辅助/, "Non-gaming", "AI tools"],
      [/vpn|cleaner|scanner|file manager|utility|工具|清理|扫描|文件管理/, "Non-gaming", "Utility"],
      [/short drama|shorttv|vertical drama|短剧|微短剧|竖屏短剧/, "Non-gaming", "ShortTV"],
      [/sports|score|match live|赛事|比分|体育/, "Non-gaming", "Sports"],
      [/video|music|live streaming|entertainment|视频|音乐|直播|娱乐/, "Non-gaming", "Entertainment"],
      [/social|chat|dating|community|社交|聊天|交友|社区/, "Non-gaming", "Social"],
    ];

    const matched = rules.find(([pattern]) => pattern.test(text));
    if (matched) {
      return { genre: matched[1], subGenre: matched[2], confidence: "根据产品页面内容识别" };
    }

    if (/casual|puzzle|match 3|match-3|runner|merge|休闲|解谜|跑酷|三消/.test(text)) {
      const subGenre = hasAds ? "Casual-IAA" : "Casual-IAP";
      return {
        genre: "Casual",
        subGenre,
        confidence: "根据产品页面内容识别",
        ...(!hasAds && !hasIap ? { commercializationNote: "商业化模式待确认" } : {}),
      };
    }

    if (/game|games|游戏/.test(text)) {
      return {
        genre: "Casual",
        subGenre: hasAds ? "Casual-IAA" : "Casual-IAP",
        confidence: "根据产品页面内容识别",
        ...(!hasAds && !hasIap ? { commercializationNote: "商业化模式待确认" } : {}),
      };
    }

    return result;
  }

  function extractEntityNameFromPageText(pageText) {
    const text = normalizeText(pageText).replace(/\s+/g, " ");
    if (!text) return "";

    const patterns = [
      /\bSeller\s+(.+?)(?:\s+Size\b|\s+Category\b|\s+Compatibility\b|\s+Age Rating\b|$)/i,
      /\bOffered by\s+(.+?)(?:\s+Contains ads\b|\s+In-app purchases\b|\s+Downloads\b|$)/i,
      /\bDeveloper:?\s+(.+?)(?:\s+Role Playing\b|\s+Action\b|\s+Strategy\b|\s+Simulation\b|\s+Games?\b|$)/i,
      /\bDeveloper\s+(.+?)(?:\s+Contains ads\b|\s+In-app purchases\b|\s+Privacy Policy\b|$)/i,
      /\bProvider\s+(.+?)(?:\s+Size\b|\s+Category\b|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return keepEnglishEntityName(match[1].trim().replace(/[|·•]+$/g, "").trim());
      }
    }
    return "";
  }

  function keepEnglishEntityName(value) {
    const normalized = normalizeText(value);
    if (!normalized) return "";
    if (/[^\x00-\x7F]/.test(normalized)) return "";
    return normalized
      .replace(/\s+-\s+英文主体待确认$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function guessCategoryFromProductLinks(productLinks, isAgency = false) {
    const firstLink = normalizeProductLinks(productLinks)[0] || "";
    const rawText = firstLink.toLowerCase();
    const isOneStoreCategoryLink = /onestore\.co\.kr/.test(rawText);
    const text = isOneStoreCategoryLink
      ? rawText.replace(/onestore|one-store|store/g, " ")
      : rawText;

    const rules = [
      [/casino|slots?|bingo|poker/, "Slots/Social Casino", "Slots/Social Casino"],
      [/realmoney|bet|cash|payout|withdraw/, "RealMoney", "RealMoney"],
      [/scratch/, "Scratcher", "Scratcher"],
      [/rpg|role|hero|dragon|quest/, "Core", "RPG"],
      [/slg|strategy|kingdom|empire|war/, "Core", "SLG"],
      [/action|shoot|fight|battle/, "Core", "Action"],
      [/sim|farm|city|tycoon/, "Core", "Simulation"],
      [/shopping|e-commerce|ecommerce|mall|marketplace|commerce/, "Non-gaming", "e-Commerce"],
      [/fintech|bank|loan|wallet|pay/, "Non-gaming", "Fintech"],
      [/read|novel|book|comic|news/, "Non-gaming", "Reading"],
      [/\bai\b|chatbot|gpt|generator/, "Non-gaming", "AI tools"],
      [/vpn|clean|scanner|utility|tools?/, "Non-gaming", "Utility"],
      [/video|music|live|entertainment/, "Non-gaming", "Entertainment"],
      [/shorttv|drama|reel/, "Non-gaming", "ShortTV"],
      [/sport|score|match/, "Non-gaming", "Sports"],
      [/social|chat|dating|community/, "Non-gaming", "Social"],
      [/puzzle|match|runner|merge|casual/, "Casual", "Casual-IAP"],
    ];

    const matched = rules.find(([pattern]) => pattern.test(text));
    if (isAgency) {
      return matched
        ? { genre: "Agency", subGenre: matched[2], confidence: "Agency 优先品类，子品类根据第一条产品链接识别" }
        : { genre: "Agency", subGenre: "", confidence: "Agency 优先品类，子品类待确认" };
    }
    if (!matched && isOneStoreCategoryLink) {
      return {
        genre: "",
        subGenre: "",
        confidence: "One Store 链接未包含足够品类信息，需按产品详情人工确认",
      };
    }
    if (!matched) return { genre: "", subGenre: "", confidence: "未能从链接文本判断品类" };
    return { genre: matched[1], subGenre: matched[2], confidence: "根据产品链接关键词初步识别" };
  }

  function extractBundleIdFromLink(link) {
    const appStoreMatch = link.match(/\/id(\d{5,})(?:[/?#]|$)/i);
    if (appStoreMatch) {
      return `id${appStoreMatch[1]}`;
    }

    const isOneStoreLink = /(^https?:\/\/)?([^/]+\.)?onestore\.co\.kr\//i.test(link);

    try {
      const url = new URL(link);
      if (isOneStoreLink) {
        const packageName =
          url.searchParams.get("packageName") ||
          url.searchParams.get("package") ||
          url.searchParams.get("pkg") ||
          url.searchParams.get("appId") ||
          url.searchParams.get("applicationId") ||
          url.searchParams.get("id");
        if (/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(packageName || "")) {
          return packageName;
        }
        return "待确认（One Store 需开发者平台/配置确认 Package Name）";
      }

      const playId = url.searchParams.get("id");
      if (/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(playId || "")) {
        return playId;
      }
    } catch (_error) {
      if (isOneStoreLink) {
        const packageMatch = link.match(
          /[?&](?:packageName|package|pkg|appId|applicationId|id)=([a-zA-Z][\w]*(?:\.[\w]+)+)/
        );
        return packageMatch
          ? packageMatch[1]
          : "待确认（One Store 需开发者平台/配置确认 Package Name）";
      }
      const idMatch = link.match(/[?&]id=([a-zA-Z][\w]*(?:\.[\w]+)+)/);
      if (idMatch) {
        return idMatch[1];
      }
    }

    if (isOneStoreLink) {
      return "待确认（One Store 需开发者平台/配置确认 Package Name）";
    }

    const fallbackPlayId = link.match(/[?&]id=([a-zA-Z][\w]*(?:\.[\w]+)+)/);
    return fallbackPlayId ? fallbackPlayId[1] : "待确认";
  }

  function extractBundleIds(productLinks) {
    return normalizeProductLinks(productLinks).map(extractBundleIdFromLink);
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateInputDetails(input) {
    const errors = [];

    const addError = (field, message) => {
      errors.push({ field, message });
    };

    for (const [key, message] of REQUIRED_FIELDS) {
      if (!normalizeText(input[key])) {
        addError(key, message);
      }
    }

    if (normalizeText(input.email) && normalizeEmailInput(input.email).length === 0) {
      addError("email", "客户邮箱中未识别到有效邮箱");
    }

    const dailySpend = normalizeText(input.dailySpend);
    if (dailySpend && Number.isNaN(Number(dailySpend))) {
      addError("dailySpend", "预估日预算必须是数字");
    }

	    if (normalizeText(input.isAgency) === "是") {
	      const entityName = normalizeText(input.entityName);
	      if (!entityName) {
	        addError("entityName", "输入营业执照公司名称");
	      } else if (!keepEnglishEntityName(entityName)) {
	        addError("entityName", "主体名称需要翻译为英文后再提交");
	      }
	      const note = normalizeText(input.note);
	      if (!note) {
	        addError("note", "Agency 客户必须填写 Note，粘贴营业执照链接或文件名说明");
      } else if (
        !/https:\/\/(?:bluefocus\.feishu\.cn\/(?:drive|file|docs|wiki)|drive\.google\.com\/(?:file\/d|open\b|drive\/folders))\//.test(
          note
        )
      ) {
	        addError("note", "Agency 客户必须在 Note 粘贴飞书或 Google Drive 营业执照链接");
	      }
	    }
	    if (normalizeText(input.isExistingAccount) === "是" && !normalizeText(input.adAccountName)) {
	      addError("adAccountName", "老账户必须填写广告账户名");
	    }

	    const outputGenre = normalizeText(input.isAgency) === "是" ? "Agency" : normalizeText(input.genre);
	    const outputSubGenre = normalizeText(input.subGenre);
	    if (outputGenre && !isAllowedGenre(outputGenre)) {
	      addError("genre", "品类必须是下拉菜单中的选项");
	    }
	    if (outputSubGenre && !isAllowedSubGenre(outputSubGenre)) {
	      addError("subGenre", "子品类必须是下拉菜单中的选项");
	    }
	    if (outputGenre && outputSubGenre && !isLogicalSubGenre(outputGenre, outputSubGenre)) {
	      addError("subGenre", "品类与子品类不匹配，请从下拉菜单重新选择");
	    }

	    return errors;
	  }

  function validateInput(input) {
    return validateInputDetails(input).map((item) => item.message);
  }

  function titleCasePart(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function inferNameFromEmail(email) {
    const prefix = normalizeText(email).split("@")[0] || "";
    if (!prefix) return { firstName: "", lastName: "" };

    const cleanPrefix = prefix.replace(/[._-]+/g, " ");
    const parts = cleanPrefix.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return {
        firstName: titleCasePart(parts[0]),
        lastName: titleCasePart(parts[parts.length - 1]),
      };
    }

    const camelParts = prefix.match(/[a-z]+|[A-Z][a-z]*/g);
    if (camelParts && camelParts.length >= 2) {
      return {
        firstName: titleCasePart(camelParts[0]),
        lastName: titleCasePart(camelParts[camelParts.length - 1]),
      };
    }

    const commonFirstNames = [
      "eve",
      "jolie",
      "kimmy",
      "ron",
      "nina",
      "sharon",
      "david",
      "michael",
      "jack",
      "lily",
      "lucy",
      "anna",
    ];
    const lower = prefix.toLowerCase();
    const matchedFirstName = commonFirstNames.find(
      (name) => lower.startsWith(name) && lower.length > name.length
    );
    if (matchedFirstName) {
      return {
        firstName: titleCasePart(matchedFirstName),
        lastName: titleCasePart(lower.slice(matchedFirstName.length)),
      };
    }

    const fallback = titleCasePart(prefix);
    return { firstName: fallback, lastName: fallback };
  }

  function inferNamesFromEmails(emailValue) {
    const inferred = normalizeEmailInput(emailValue).map(inferNameFromEmail);
    return {
      firstName: inferred.map((name) => name.firstName).join("\n"),
      lastName: inferred.map((name) => name.lastName).join("\n"),
    };
  }

  function addDays(dateText, days) {
    const date = new Date(`${dateText}T00:00:00+08:00`);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  }

  function prefixAgencyCompanyName(companyName, isAgency) {
    const normalized = normalizeText(companyName);
    if (normalizeText(isAgency) !== "是") return normalized;
    return /^AG-/i.test(normalized) ? normalized : `AG-${normalized}`;
  }

  function buildComments(input, genre, subGenre) {
    const provided = normalizeText(input.comments);
    if (provided) return provided;

    const categoryText = [genre, subGenre].filter(Boolean).join(" / ") || "待确认";
    const geo = normalizeText(input.geo) || "待确认";
    return `客户品类为 ${categoryText}，投放地区为 ${geo}。`;
  }

  function buildSubmission(input, options = {}) {
    const errorDetails = validateInputDetails(input);
    const errors = errorDetails.map((item) => item.message);
    const isAgency = normalizeText(input.isAgency) === "是";
    const normalizedEmails = normalizeEmailInput(input.email);
    const primaryEmail = normalizedEmails[0] || normalizeText(input.email);
    const inferredName = inferNameFromEmail(primaryEmail);
	    const genre = isAgency ? "Agency" : normalizeText(input.genre);
	    const subGenre = normalizeText(input.subGenre);
	    const isExistingAccount = normalizeText(input.isExistingAccount) === "是";
    const today =
      options.today ||
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
    const dailySpend = normalizeDailySpend(input.dailySpend);

    const rowObject = {
      agencySales: normalizeText(input.agencySales),
      companyName: prefixAgencyCompanyName(input.companyName, input.isAgency),
      entityName: keepEnglishEntityName(input.entityName),
      clientLastName: normalizeText(input.clientLastName) || inferredName.lastName,
      clientFirstName: normalizeText(input.clientFirstName) || inferredName.firstName,
      contactRole: normalizeText(input.contactRole) || "UA",
      email: primaryEmail,
      molocoSales: normalizeText(input.molocoSales),
      genre,
      subGenre,
      geo: normalizeText(input.geo),
      creationDate: today,
      expectedLaunchDate: normalizeText(input.expectedLaunchDate) || addDays(today, 14),
      comments: buildComments(input, genre, subGenre),
      stage: normalizeText(input.stage) || "开户中",
      budgetBucket: normalizeText(input.budgetBucket) || "尾部(<1k)",
      dailySpend,
      bundleId: extractBundleIds(input.productLinks).join("\n"),
	      adAccountName: normalizeText(input.adAccountName),
      agencyAm: "",
      agreeToPublishOnGetApps: "",
      week: "",
      pipelineSource: "",
      agency: normalizeText(input.agency) || "MADHOUSE",
      workplace: "",
	      newCustomerStatus: isExistingAccount
	        ? "Existing"
	        : normalizeText(input.newCustomerStatus) || "New",
      pipelineCreationDays: "",
      creationDateWriteInDate: "",
      note: normalizeText(input.note),
    };

    const values = [
      rowObject.agencySales,
      rowObject.companyName,
      rowObject.entityName,
      rowObject.clientLastName,
      rowObject.clientFirstName,
      rowObject.contactRole,
      rowObject.email,
      rowObject.molocoSales,
      rowObject.genre,
      rowObject.subGenre,
      rowObject.geo,
      rowObject.creationDate,
      rowObject.expectedLaunchDate,
      rowObject.comments,
      rowObject.stage,
      rowObject.budgetBucket,
      rowObject.dailySpend,
      rowObject.bundleId,
      rowObject.adAccountName,
      rowObject.agencyAm,
      rowObject.agreeToPublishOnGetApps,
      rowObject.week,
      rowObject.pipelineSource,
      rowObject.agency,
      rowObject.workplace,
      rowObject.newCustomerStatus,
      rowObject.pipelineCreationDays,
      rowObject.creationDateWriteInDate,
      rowObject.note,
    ];

    return { values, rowObject, errors, errorDetails };
  }

  return {
      buildSubmission,
      classifyCategoryFromPageText,
	      extractBundleIds,
	      extractEntityNameFromPageText,
	      guessCategoryFromProductLinks,
	      inferNamesFromEmails,
	      isAllowedGenre,
	      isAllowedSubGenre,
	      keepEnglishEntityName,
      mapOpeningSheetCellsToInput,
      mapSpreadsheetRowToInput,
      normalizeMolocoSales,
      normalizeDailySpend,
      normalizeEmailInput,
      normalizeProductLinks,
      parseDelimitedTable,
      parseXlsxCells,
      parseXlsxXmlTable,
      selectXlsxWorksheetName,
      validateInput,
      validateInputDetails,
  };
});
