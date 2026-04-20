const processCountInput = document.getElementById("processCount");
const resourceCountInput = document.getElementById("resourceCount");
const buildBtn = document.getElementById("buildBtn");
const sampleBtn = document.getElementById("sampleBtn");
const runBtn = document.getElementById("runBtn");
const tablesArea = document.getElementById("tablesArea");
const statusBadge = document.getElementById("statusBadge");
const sequenceText = document.getElementById("sequenceText");
const traceList = document.getElementById("traceList");

let pCount = 5;
let rCount = 3;

const tableConfigs = [
  { id: "allocation", title: "Allocation" },
  { id: "max", title: "Max" },
  { id: "available", title: "Available" },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeInput(value = 0) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.value = String(value);
  return input;
}

function buildMatrixTable(tableId, title) {
  const wrap = document.createElement("section");
  wrap.className = "matrix-wrap";

  const heading = document.createElement("h3");
  heading.textContent = title;
  wrap.appendChild(heading);

  const table = document.createElement("table");
  table.className = "matrix";
  table.dataset.table = tableId;

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const firstHeader = document.createElement("th");
  firstHeader.textContent = tableId === "available" ? "Resource" : "Process";
  headRow.appendChild(firstHeader);

  if (tableId === "available") {
    const h = document.createElement("th");
    h.textContent = "Instances";
    headRow.appendChild(h);
  } else {
    for (let r = 0; r < rCount; r += 1) {
      const h = document.createElement("th");
      h.textContent = `R${r}`;
      headRow.appendChild(h);
    }
  }

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  if (tableId === "available") {
    for (let r = 0; r < rCount; r += 1) {
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.textContent = `R${r}`;
      row.appendChild(label);

      const td = document.createElement("td");
      td.appendChild(makeInput(0));
      row.appendChild(td);
      tbody.appendChild(row);
    }
  } else {
    for (let p = 0; p < pCount; p += 1) {
      const row = document.createElement("tr");
      const label = document.createElement("td");
      label.textContent = `P${p}`;
      row.appendChild(label);

      for (let r = 0; r < rCount; r += 1) {
        const td = document.createElement("td");
        td.appendChild(makeInput(0));
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildWorkspace() {
  pCount = clamp(Number(processCountInput.value) || 1, 1, 10);
  rCount = clamp(Number(resourceCountInput.value) || 1, 1, 6);
  processCountInput.value = String(pCount);
  resourceCountInput.value = String(rCount);

  tablesArea.innerHTML = "";
  tableConfigs.forEach(({ id, title }) => {
    tablesArea.appendChild(buildMatrixTable(id, title));
  });

  setNeutralState();
}

function getMatrix(tableId) {
  const table = tablesArea.querySelector(`table[data-table="${tableId}"]`);
  const rows = Array.from(table.querySelectorAll("tbody tr"));

  return rows.map((row) =>
    Array.from(row.querySelectorAll("td input")).map((input) =>
      Math.max(0, Number(input.value) || 0)
    )
  );
}

function setMatrix(tableId, values) {
  const table = tablesArea.querySelector(`table[data-table="${tableId}"]`);
  if (!table) return;

  const rows = Array.from(table.querySelectorAll("tbody tr"));
  rows.forEach((row, r) => {
    const inputs = Array.from(row.querySelectorAll("td input"));
    inputs.forEach((input, c) => {
      input.value = String(values[r]?.[c] ?? 0);
    });
  });
}

function setNeutralState() {
  statusBadge.textContent = "Waiting for input…";
  statusBadge.className = "badge neutral";
  sequenceText.textContent = "—";
  traceList.innerHTML = "";
}

function runBankersAlgorithm(allocation, max, availableVector) {
  const need = max.map((row, p) =>
    row.map((val, r) => {
      const n = val - allocation[p][r];
      return n >= 0 ? n : 0;
    })
  );

  const work = [...availableVector];
  const finish = Array(pCount).fill(false);
  const sequence = [];
  const trace = [];

  let progressed = true;

  while (sequence.length < pCount && progressed) {
    progressed = false;

    for (let p = 0; p < pCount; p += 1) {
      if (finish[p]) continue;

      const canRun = need[p].every((required, r) => required <= work[r]);
      if (canRun) {
        trace.push(
          `P${p} can run (Need: [${need[p].join(", ")}], Work before: [${work.join(", ")}]).`
        );

        for (let r = 0; r < rCount; r += 1) {
          work[r] += allocation[p][r];
        }

        trace.push(`P${p} finished. Work after release: [${work.join(", ")}].`);
        finish[p] = true;
        sequence.push(`P${p}`);
        progressed = true;
      }
    }
  }

  if (sequence.length < pCount) {
    const pending = finish
      .map((done, p) => (!done ? `P${p}` : null))
      .filter(Boolean)
      .join(", ");
    trace.push(`No further process can proceed. Blocked: ${pending}.`);
  }

  return { safe: sequence.length === pCount, sequence, trace };
}

function renderResult(result) {
  if (result.safe) {
    statusBadge.textContent = "SAFE STATE";
    statusBadge.className = "badge safe";
    sequenceText.textContent = result.sequence.join(" → ");
  } else {
    statusBadge.textContent = "UNSAFE STATE";
    statusBadge.className = "badge unsafe";
    sequenceText.textContent = result.sequence.length
      ? `${result.sequence.join(" → ")} (partial)`
      : "No safe sequence";
  }

  traceList.innerHTML = "";
  result.trace.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    traceList.appendChild(li);
  });
}

function runCheck() {
  const allocation = getMatrix("allocation");
  const max = getMatrix("max");
  const available = getMatrix("available").map((row) => row[0]);

  const result = runBankersAlgorithm(allocation, max, available);
  renderResult(result);
}

function loadClassicSample() {
  processCountInput.value = "5";
  resourceCountInput.value = "3";
  buildWorkspace();

  setMatrix("allocation", [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2],
  ]);

  setMatrix("max", [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3],
  ]);

  setMatrix("available", [[3], [3], [2]]);
  setNeutralState();
}

buildBtn.addEventListener("click", buildWorkspace);
runBtn.addEventListener("click", runCheck);
sampleBtn.addEventListener("click", loadClassicSample);

buildWorkspace();
